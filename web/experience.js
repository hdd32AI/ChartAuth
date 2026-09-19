import { suggestAssessment } from "./suggestions.js";
const $ = (id) => document.getElementById(id);
const captions = [
  "Start with the patient chart, insurance card and the service scheduled for this visit.",
  "Send one inquiry tied to the patient, member, provider and service date.",
  "Read the response. Check who it belongs to and which service it covers.",
  "Use only supported benefits. Attach the source versions that support the assessment.",
  "Save one eligibility record and name the team responsible for the next step.",
  "Check the completed workflow. Every required condition must pass before reward is one.",
];
const labels = [
  "Patient chart",
  "Inquiry sent",
  "Payer response",
  "Evidence attached",
  "Record saved",
  "Completion verified",
];
let demoCase = "A";
let chapter = 0,
  playing = false,
  elapsed = 0,
  timer = null,
  voice = false,
  demoToken = "",
  demoObservation = null,
  completed = -1,
  loading = false,
  generation = 0,
  playIntent = 0,
  loadId = 0;
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const field = (name, value, cls = "") =>
  `<div class="demo-field ${cls}"><small>${name}</small><strong>${escape(value)}</strong></div>`;
function frame(kicker, title, desc, body) {
  return `<span class="scene-kicker">${kicker}</span><h3>${title}</h3><p class="scene-description">${desc}</p>${body}`;
}
function show(n) {
  chapter = n;
  const docs = demoObservation?.source_documents,
    r = demoObservation?.payer_response,
    receipt = demoObservation?.records?.[0],
    score = demoObservation?.result;
  const human = (v) =>
    v === null || v === undefined
      ? "Unknown"
      : String(v)
          .replaceAll("_", " ")
          .replace(/^./, (s) => s.toUpperCase());
  const person = docs
      ? docs.patient.first_name + " " + docs.patient.last_name
      : "Jordan Ellis",
    member = docs?.coverage.member_id || "SYN-M401",
    service = human(docs?.visit.service_type || "physical_therapy"),
    date = docs?.visit.service_date || "2026-09-21";
  const f = r ? suggestAssessment(docs, r) : null;
  document.querySelector(".demo-initial").textContent = person
    .split(" ")
    .map((x) => x[0])
    .join("");
  document.querySelector(".demo-sidebar h3").textContent = person;
  document.querySelector(".demo-sidebar>p").textContent =
    "Patient " + (docs?.patient.id || "SYN-P1001");
  document.querySelector(".demo-visit strong").textContent = service;
  document.querySelector(".demo-visit span").textContent = date;
  const cases = [
    frame(
      "PATIENT CHART",
      "The visit starts here.",
      "Review the person, insurance card and scheduled service.",
      `<div class="demo-fields">${field("Patient", person)}${field("Member ID", member, "focused")}${field("Service", service)}${field("Date of service", date)}</div><div class="scene-action">Review the chart <span>↗</span></div>`,
    ),
    frame(
      "ELIGIBILITY INQUIRY",
      "One request for this visit.",
      "Keep patient, payer and service context together.",
      `<div class="demo-fields">${field("Member ID", member)}${field("Payer", docs?.coverage.payer_id || "Demo Health")}${field("Service", service)}${field("Inquiry state", demoObservation?.inquiries?.length ? "Sent · pending response" : "Ready", "focused")}</div><div class="pending-pulse"><i></i><i></i><i></i></div>`,
    ),
    frame(
      "CURRENT PAYER RESPONSE",
      "Read the response in context.",
      "Check identity and service scope before using the benefits.",
      `<div class="demo-fields">${field("Coverage", human(r?.coverage_status), "highlight")}${field("Returned member", r?.member_id || "Pending", "focused")}${field("Date returned", r?.service_date || "Pending")}${field("Visit copay", r?.copay == null ? "Unknown" : "$" + r.copay)}</div><div class="scene-action complete">Eligibility does not guarantee payment</div>`,
    ),
    frame(
      "SUPPORTED ASSESSMENT",
      "Let the evidence set the next step.",
      "Only usable benefits become a documented confirmation.",
      `<div class="demo-fields">${field("Usable coverage", human(f?.coverage_status), "highlight")}${field("Authorization", f?.authorization_required === null ? "Unknown" : f?.authorization_required ? "Required" : "Not required")}${field("Next team", human(f?.next_owner))}${field("Source references", "Five attached documents", "focused")}</div><div class="scene-action">${human(f?.next_action)}</div>`,
    ),
    frame(
      "SAVED ELIGIBILITY RECORD",
      "Leave the next team a clear result.",
      "One saved record links the inquiry and its supported assessment.",
      `<div class="demo-fields">${field("Disposition", human(f?.disposition), "highlight")}${field("Next team", human(f?.next_owner))}${field("Next action", human(f?.next_action))}${field("Record state", receipt ? "Saved" : "Awaiting save", "focused")}</div><div class="receipt-line">${receipt ? "Record " + escape(receipt.record_id.slice(0, 18)) : "A receipt appears after saving."}</div>`,
    ),
    frame(
      "TERMINAL VERIFICATION",
      score?.passed ? "The work checks out." : "Verify the completed work.",
      "The score follows the saved result and its evidence.",
      `<div class="completion-orb">${score?.passed ? "✓" : "·"}</div><div class="verification-list"><span>Correct patient</span><span>Current response</span><span>Supported fields</span><span>Source versions</span><span>One saved record</span><span>Correct next team</span></div><div class="scene-action complete">${score ? "Reward " + score.reward + " · " + Object.values(score.checks).filter(Boolean).length + "/15 checks" : "Run the walkthrough to see the server score"}</div>`,
    ),
  ];
  $("demo-view").innerHTML = cases[n];
  $("demo-view").style.animation = "none";
  void $("demo-view").offsetWidth;
  $("demo-view").style.animation = "";
  $("demo-caption").textContent = captions[n];
  $("demo-step-no").textContent = String(n + 1).padStart(2, "0");
  $("evidence-title").textContent = [
    "Start with the right person.",
    "Bind the request to the visit.",
    "Use the current response.",
    "Keep the sources attached.",
    "Save one supported result.",
    "Reward the completed work.",
  ][n];
  $("demo-trail").innerHTML = [
    "Patient and visit",
    "Coverage card",
    "Payer response",
    "Workflow rules",
    "Saved record",
  ]
    .map(
      (t, i) =>
        `<div class="trail-item ${n >= [0, 0, 2, 3, 4][i] ? "ready" : ""}"><i>${n >= [0, 0, 2, 3, 4][i] ? "✓" : ""}</i>${t}</div>`,
    )
    .join("");
  $("demo-score").innerHTML =
    `<span>Final reward</span><strong>${n === 5 && score ? score.reward + " / 1" : "Pending"}</strong>`;
  document
    .querySelectorAll("[data-chapter]")
    .forEach((b) =>
      b.setAttribute("aria-selected", Number(b.dataset.chapter) === n),
    );
  $("demo-cursor").style.transform =
    `translate(${[0, -40, -130, -30, -15, -155][n]}px,${[0, -80, -70, -20, -5, -60][n]}px)`;
  if (voice && playing && "speechSynthesis" in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(captions[n]);
    u.rate = 0.98;
    speechSynthesis.speak(u);
  }
}
async function api(route, payload, requestGeneration = generation) {
  const headers = {
    "Content-Type": "application/json",
    apikey: window.LAB_PUBLIC_KEY,
    Authorization: "Bearer " + window.LAB_PUBLIC_KEY,
  };
  if (window.LAB_ACCESS_TOKEN)
    headers["x-access-token"] = window.LAB_ACCESS_TOKEN;
  if (demoToken) headers["x-episode-token"] = demoToken;
  const response = await fetch(window.LAB_API + "/" + route, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (requestGeneration !== generation)
    throw Error("Superseded walkthrough request");
  if (!response.ok) throw Error(data.error || "The walkthrough could not load");
  if (data.token) demoToken = data.token;
  if (data.observation) demoObservation = data.observation;
  return data;
}
function query() {
  const d = demoObservation.source_documents;
  return {
    patient_id: d.patient.id,
    member_id: d.coverage.member_id,
    payer_id: d.coverage.payer_id,
    provider_id: d.visit.provider_id,
    service_type: d.visit.service_type,
    service_date: d.visit.service_date,
    dob: d.patient.dob,
    last_name: d.patient.last_name,
  };
}
function canonical(v) {
  const sort = (x) =>
    Array.isArray(x)
      ? x.map(sort)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, sort(x[k])]),
          )
        : x;
  return JSON.stringify(sort(v));
}
async function evidence() {
  const out = {};
  for (const [k, v] of Object.entries({
    ...demoObservation.source_documents,
    response: demoObservation.payer_response,
  })) {
    const d = structuredClone(v);
    delete d.source_digest;
    const hash = [
      ...new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(canonical(d)),
        ),
      ),
    ]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    out[k] = { id: d.id, version: d.version, digest: hash };
  }
  return out;
}
function setLoading(value) {
  loading = value;
  $("demo-play").disabled = value;
  $("watch-demo").disabled = value;
  document
    .querySelectorAll("[data-chapter]")
    .forEach((b) => (b.disabled = value));
  $("demo-stage").setAttribute("aria-busy", String(value));
}
function resetDemo() {
  generation++;
  setLoading(false);
  elapsed = 0;
  demoToken = "";
  demoObservation = null;
  completed = -1;
}
async function ensure(n) {
  if (loading) return false;
  const requestGeneration = generation,
    requestId = ++loadId;
  setLoading(true);
  $("demo-live").textContent = "Connecting to the environment…";
  try {
    if (!demoObservation) {
      await api("reset", { case_key: demoCase }, requestGeneration);
      completed = 0;
    }
    while (completed < n) {
      let action;
      switch (completed + 1) {
        case 1:
          action = {
            type: "query",
            request: query(),
            idempotency_key: "tour-inquiry",
          };
          break;
        case 2:
          action = { type: "poll" };
          break;
        case 3:
          action = {
            type: "assess",
            assessment: {
              fields: suggestAssessment(
                demoObservation.source_documents,
                demoObservation.payer_response,
              ),
              evidence: await evidence(),
            },
          };
          break;
        case 4:
          action = { type: "save", idempotency_key: "tour-record" };
          break;
        case 5:
          action = { type: "finish" };
          break;
      }
      if (requestGeneration !== generation) return false;
      await api("step", action, requestGeneration);
      completed++;
    }
    if (requestGeneration !== generation) return false;
    $("demo-live").textContent =
      "Connected · " + demoObservation.episode_id.slice(0, 8);
    return true;
  } catch (e) {
    if (requestGeneration !== generation) return false;
    pause();
    $("demo-live").textContent = "Connection needs attention";
    $("demo-caption").textContent = e.message + ". Restart to try again.";
    return false;
  } finally {
    if (requestGeneration === generation && requestId === loadId)
      setLoading(false);
  }
}
function progress() {
  const s = Math.min(36, elapsed);
  $("demo-time").textContent =
    "00:" + String(Math.floor(s)).padStart(2, "0") + " / 00:36";
  $("demo-progress-bar").style.width = (s / 36) * 100 + "%";
  document
    .querySelector(".demo-progress")
    .setAttribute("aria-valuenow", String(Math.min(6, s / 6)));
}
function pause() {
  playIntent++;
  playing = false;
  clearInterval(timer);
  timer = null;
  $("demo-play").textContent = "▶";
  $("demo-play").setAttribute("aria-label", "Pause walkthrough");
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
async function play() {
  if (playing) {
    pause();
    return;
  }
  if (elapsed >= 36) resetDemo();
  const intent = ++playIntent,
    requestGeneration = generation;
  if (
    !(await ensure(Math.min(5, Math.floor(elapsed / 6)))) ||
    intent !== playIntent ||
    requestGeneration !== generation
  )
    return;
  playing = true;
  $("demo-play").textContent = "Ⅱ";
  $("demo-play").setAttribute("aria-label", "Pause walkthrough");
  show(Math.min(5, Math.floor(elapsed / 6)));
  timer = setInterval(async () => {
    if (
      loading ||
      !playing ||
      intent !== playIntent ||
      requestGeneration !== generation
    )
      return;
    elapsed += 0.25;
    const n = Math.min(5, Math.floor(elapsed / 6));
    if (n !== chapter) {
      if (
        !(await ensure(n)) ||
        !playing ||
        intent !== playIntent ||
        requestGeneration !== generation
      )
        return;
      show(n);
    }
    progress();
    if (elapsed >= 36) pause();
  }, 250);
}
$("demo-play").onclick = play;
$("demo-restart").onclick = () => {
  pause();
  resetDemo();
  show(0);
  progress();
  $("demo-live").textContent = "Illustrated workflow";
};
document.querySelectorAll("[data-chapter]").forEach(
  (b) =>
    (b.onclick = async () => {
      pause();
      const n = Number(b.dataset.chapter),
        intent = playIntent,
        requestGeneration = generation;
      if (
        (await ensure(n)) &&
        intent === playIntent &&
        requestGeneration === generation
      ) {
        elapsed = n * 6;
        show(n);
        progress();
      }
    }),
);
$("watch-demo").onclick = () => {
  $("walkthrough").scrollIntoView({ behavior: "smooth", block: "start" });
  play();
};
$("demo-narrate").onclick = () => {
  voice = !voice;
  $("demo-narrate").textContent = voice ? "Narration on" : "Narration off";
  $("demo-narrate").setAttribute("aria-pressed", String(voice));
  if (voice && playing) show(chapter);
  else if ("speechSynthesis" in window) speechSynthesis.cancel();
};
const comparisons = {
  A: {
    member: "SYN-M401",
    coverage: "Active",
    usable: "$30 copay",
    title: "Proceed to authorization",
    body: "The member matches. Record active benefits and send the next task to the authorization team.",
  },
  B: {
    member: "SYN-M401",
    coverage: "Inactive",
    usable: "Unknown",
    title: "Request updated coverage",
    body: "The member matches, but coverage is inactive. Registration needs updated insurance before usable benefits can be recorded.",
  },
  C: {
    member: "SYN-M999",
    coverage: "Active",
    usable: "Unknown",
    title: "Resolve the member identity",
    body: "The payer returned benefits for a different member. Keep usable benefits unknown and route the mismatch to registration.",
  },
};
function compare(k) {
  const c = comparisons[k];
  $("decision-card").innerHTML =
    `<div class="compare-head"><span>CURRENT CHART · SYN-M401</span><span>CASE ${k}</span></div><div class="compare-line ${k === "C" ? "warning" : ""}"><span>Returned member</span><strong>${c.member}</strong></div><div class="compare-line ${k === "B" ? "warning" : ""}"><span>Payer coverage</span><strong>${c.coverage}</strong></div><div class="compare-line"><span>Usable benefit</span><strong>${c.usable}</strong></div><div class="compare-outcome"><small>SUPPORTED NEXT ACTION</small><h3>${c.title}</h3><p>${c.body}</p></div>`;
  document
    .querySelectorAll("[data-compare]")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.compare === k));
}
document
  .querySelectorAll("[data-compare]")
  .forEach((b) => (b.onclick = () => compare(b.dataset.compare)));
compare("A");
show(0);
document
  .querySelectorAll("[data-page]")
  .forEach((b) => b.addEventListener("click", pause));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});

$("demo-scenario").onchange = () => {
  pause();
  demoCase = $("demo-scenario").value;
  resetDemo();
  show(0);
  progress();
  return play();
};
