import fs from "node:fs/promises";
import { reset, step, observe, evidenceFor } from "../core/environment.mjs";
import { expectedInquiry, expectedFields } from "../core/fixtures.mjs";
const simulationStart = Date.parse("2026-09-21T09:00:00Z");
for (const key of ["A", "B", "C"]) {
  let session = reset(key, simulationStart);
  const actions = [];
  async function take(action) {
    actions.push(action);
    const result = await step(
      session,
      action,
      simulationStart + actions.length * 1000,
    );
    if (result.error) throw Error(result.error);
    session = result.session;
  }
  await take({
    type: "query",
    request: expectedInquiry(session.source_documents),
    idempotency_key: "example-inquiry",
  });
  await take({ type: "poll" });
  await take({
    type: "assess",
    assessment: {
      fields: expectedFields(session.reference),
      evidence: await evidenceFor(session),
    },
  });
  await take({ type: "save", idempotency_key: "example-record" });
  await take({ type: "finish" });
  await fs.writeFile(
    new URL(`case-${key}.json`, import.meta.url),
    JSON.stringify(
      { case: key, actions, terminal: await observe(session) },
      null,
      2,
    ) + "\n",
  );
  console.log(`Case ${key}: reward ${session.result.reward}`);
}
