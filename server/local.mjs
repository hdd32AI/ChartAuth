import { pages } from "./pages.mjs";
import { worklist } from "../core/fixtures.mjs";
import http from "node:http";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { reset, observe, step, VERSION } from "../core/environment.mjs";

const sessions = new Map();
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../web",
);
const port = Number(process.env.PORT || 4173);
const server = http.createServer(async (req, res) => {
  const send = (data, status = 200) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  const pathname = new URL(req.url, "http://localhost").pathname;
  try {
    if (
      req.method === "GET" &&
      [
        "/",
        "/index.html",
        "/paper.html",
        "/notes",
        "/worklist",
        "/research",
        "/production",
        "/impact",
      ].includes(pathname)
    ) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(
        pages[
          ["/paper.html", "/notes"].includes(pathname) ? "paper" : "index"
        ].replace('<base href="/chartauth/">', '<base href="/">'),
      );
    }
    if (req.method === "GET" && pathname === "/api/health")
      return send({ status: "ready", version: VERSION, data: "synthetic" });
    if (req.method === "POST" && pathname.startsWith("/api/")) {
      let text = "";
      for await (const chunk of req) {
        text += chunk;
        if (Buffer.byteLength(text) > 32768)
          return send({ error: "Request too large" }, 413);
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return send({ error: "Invalid JSON" }, 400);
      }
      if (pathname === "/api/worklist")
        return send({
          items: worklist,
          total: worklist.length,
          scenario_families: 10,
          scenario_templates: 50,
        });
      if (pathname === "/api/reset") {
        if (
          !["A", "B", "C"].includes(body?.case_key) &&
          !worklist.some((x) => x.case_key === body?.case_key)
        )
          return send({ error: "Unknown case" }, 400);
        const token =
          crypto.randomUUID().replaceAll("-", "") +
          crypto.randomUUID().replaceAll("-", "");
        const state = reset(body.case_key);
        sessions.set(token, state);
        return send({ token, observation: await observe(state) });
      }
      const token = req.headers["x-episode-token"];
      const state = sessions.get(token);
      if (!state) return send({ error: "Episode unavailable" }, 401);
      if (pathname === "/api/observe" || pathname === "/api/export")
        return send({ observation: await observe(state) });
      if (pathname === "/api/step") {
        // Serializes local actions per session while the hosted adapter uses database compare-and-swap.
        if (state.busy) return send({ error: "Concurrent action" }, 409);
        state.busy = true;
        const next = await step({ ...state, busy: undefined }, body);
        sessions.set(token, next.session);
        return send(
          {
            observation: await observe(next.session),
            output: next.output,
            error: next.error,
          },
          next.code,
        );
      }
      return send({ error: "Not found" }, 404);
    }
    const allowed = {
      "/": "index.html",
      "/index.html": "index.html",
      "/app.js": "app.js",
      "/suggestions.js": "suggestions.js",
      "/style.css": "style.css",
      "/config.js": "config.js",
      "/experience.js": "experience.js",
      "/experience.css": "experience.css",
      "/worklist.js": "worklist.js",
      "/paper.html": "paper.html",
      "/paper.js": "paper.js",
      "/paper.css": "paper.css",
      "/impact.js": "impact.js",
      "/economics.mjs": "economics.mjs",
      "/sources.css": "sources.css",
      "/access.css": "access.css",
      "/access.js": "access.js",
    };
    if (/^\/assets\/[A-Za-z0-9_.-]+$/.test(pathname))
      allowed[pathname] = pathname.slice(1);
    if (req.method !== "GET" || !allowed[pathname])
      return send({ error: "Not found" }, 404);
    let content = await fs.readFile(path.join(root, allowed[pathname]));
    if (pathname === "/config.js")
      content = Buffer.from("window.LAB_API = '/api';");
    res.writeHead(200, {
      "Content-Type":
        pathname.endsWith(".js") || pathname.endsWith(".mjs")
          ? "text/javascript"
          : pathname.endsWith(".css")
            ? "text/css"
            : pathname.endsWith(".svg")
              ? "image/svg+xml"
              : pathname.endsWith(".png")
                ? "image/png"
                : pathname.endsWith(".jpg")
                  ? "image/jpeg"
                  : pathname.endsWith(".mp4")
                    ? "video/mp4"
                    : pathname.endsWith(".pdf")
                      ? "application/pdf"
                      : pathname.endsWith(".zip")
                        ? "application/zip"
                        : pathname.endsWith(".vtt")
                          ? "text/vtt"
                          : "text/html",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
  } catch {
    send(
      { status: "input_error", reward: null, error: "Environment error" },
      503,
    );
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`ChartAuth http://localhost:${port}`),
);
