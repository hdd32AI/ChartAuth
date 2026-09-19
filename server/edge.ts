import { pages } from "./pages.mjs";
import { worklist } from "../core/fixtures.mjs";
import { reset, observe, step, digest, VERSION } from "../core/environment.mjs";

// Minimal host contract keeps this standalone adapter type-checkable outside Deno.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};

const responseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-episode-token, x-access-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: responseHeaders });
async function database(path: string, options: RequestInit = {}) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!key || !url) throw new Error("Storage is unavailable");
  const response = await fetch(url + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  if (!response.ok) throw new Error("Storage operation failed");
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://chartauth.ai",
    "https://www.chartauth.ai",
    "https://chartauth.vercel.app",
    "https://chartauth-ai.vercel.app",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ];
  if (origin && !allowedOrigins.includes(origin))
    return json({ error: "Origin not allowed" }, 403);
  const headers = {
    ...responseHeaders,
    ...(origin
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  };
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (req.method === "GET" && route === "health")
    return reply({ status: "ready", version: VERSION, data: "synthetic" });
  if (
    req.method !== "POST" ||
    ![
      "reset",
      "observe",
      "step",
      "export",
      "worklist",
      "login",
      "portal",
    ].includes(route || "")
  )
    return reply({ error: "Not found" }, 404);
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 32768)
      return reply({ error: "Request too large" }, 413);
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return reply({ error: "Invalid JSON" }, 400);
    }
    if (!payload || Array.isArray(payload) || typeof payload !== "object")
      return reply({ error: "Expected an object" }, 400);
    if (route === "login") {
      if (
        Object.keys(payload).some((k) => k !== "password") ||
        typeof payload.password !== "string" ||
        payload.password.length > 128
      )
        return reply({ error: "Enter the access password" }, 400);
      const allowed = await database("rpc/chartauth_login_allowed", {
        method: "POST",
        body: "{}",
      });
      if (!allowed)
        return reply(
          { error: "Too many attempts. Please try again in ten minutes." },
          429,
        );
      const config = (
        await database(
          "chartauth_access_config?id=eq.1&select=salt,password_hash",
        )
      )?.[0];
      if (!config) return reply({ error: "Access is not configured" }, 503);
      const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(payload.password),
        "PBKDF2",
        false,
        ["deriveBits"],
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode(config.salt),
          iterations: 210000,
          hash: "SHA-256",
        },
        material,
        256,
      );
      const hash = [...new Uint8Array(bits)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      let difference = 0;
      for (let i = 0; i < 64; i++)
        difference |= hash.charCodeAt(i) ^ config.password_hash.charCodeAt(i);
      if (difference)
        return reply(
          { error: "That password did not match. Please try again." },
          401,
        );
      const token =
        crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", "");
      await database("chartauth_access_sessions", {
        method: "POST",
        body: JSON.stringify({ token_hash: await digest(token) }),
      });
      return reply({ token, expires_in: 43200 });
    }
    const accessToken = req.headers.get("x-access-token") || "";
    if (!/^[0-9a-f]{64}$/.test(accessToken))
      return reply({ error: "Sign in to open the workspace" }, 401);
    const access = (
      await database(
        "chartauth_access_sessions?token_hash=eq." +
          (await digest(accessToken)) +
          "&select=expires_at",
      )
    )?.[0];
    if (!access || Date.parse(access.expires_at) < Date.now())
      return reply({ error: "Access expired. Sign in again." }, 401);
    if (route === "portal") {
      if (
        !["index", "paper"].includes(payload.page) ||
        Object.keys(payload).some((k) => k !== "page")
      )
        return reply({ error: "Unknown page" }, 400);
      return reply({ html: pages[payload.page as keyof typeof pages] });
    }
    if (route === "worklist") {
      if (Object.keys(payload).length)
        return reply({ error: "Worklist takes no parameters" }, 400);
      const items = await database(
        "chartauth_worklist?select=*&order=case_key.asc&limit=1000",
      );
      return reply({
        items,
        total: items.length,
        inventory_type: "fictional_visits",
        scenario_families: 10,
        scenario_templates: 50,
      });
    }
    if (route === "reset") {
      if (
        (!["A", "B", "C"].includes(payload.case_key) &&
          !worklist.some((x) => x.case_key === payload.case_key)) ||
        Object.keys(payload).some((k) => k !== "case_key")
      )
        return reply(
          { error: "Choose a valid worklist visit or case A, B or C" },
          400,
        );
      const token =
        crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", "");
      const session = reset(payload.case_key);
      const accepted = await database("rpc/chartauth_create", {
        method: "POST",
        body: JSON.stringify({ p_hash: await digest(token), p_state: session }),
      });
      if (!accepted)
        return reply(
          { error: "Demo capacity reached. Please try again later." },
          429,
        );
      return reply({ token, observation: await observe(session) });
    }
    const token = req.headers.get("x-episode-token") || "";
    if (!/^[0-9a-f]{64}$/.test(token))
      return reply({ error: "A valid episode token is required" }, 401);
    const hash = await digest(token);
    const rows = await database(
      `chartauth_sessions?token_hash=eq.${hash}&select=state,revision,expires_at`,
    );
    const row = rows?.[0];
    if (!row || Date.parse(row.expires_at) < Date.now())
      return reply({ error: "Episode expired or unavailable" }, 401);
    if (route === "observe")
      return reply({ observation: await observe(row.state) });
    if (route === "export")
      return reply({
        observation: await observe(row.state),
        export_type: "episode_record",
        version: VERSION,
      });
    const next = await step(row.state, payload);
    const saved = await database(
      `chartauth_sessions?token_hash=eq.${hash}&revision=eq.${row.revision}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          state: next.session,
          revision: row.revision + 1,
        }),
      },
    );
    if (!saved?.length)
      return reply(
        {
          error:
            "A concurrent action completed first. Refresh status and retry the same action.",
        },
        409,
      );
    return reply(
      {
        observation: await observe(next.session),
        output: "output" in next ? next.output : undefined,
        error: "error" in next ? next.error : undefined,
      },
      next.code,
    );
  } catch {
    return reply(
      {
        status: "input_error",
        reward: null,
        error:
          "The environment could not complete this operation. Retry or start a fresh episode.",
      },
      503,
    );
  }
});
