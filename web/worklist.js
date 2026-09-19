const $ = (id) => document.getElementById(id);
let inventory = [],
  filtered = [],
  page = 0;
const size = 20;

function draw() {
  const q = $("work-search").value.trim().toLowerCase(),
    s = $("work-scenario").value,
    l = $("work-location").value;
  filtered = inventory.filter(
    (x) =>
      (s === "all" || x.scenario === s) &&
      (l === "all" || x.location === l) &&
      [
        x.first_name + " " + x.last_name,
        x.patient_id,
        x.member_id,
        x.case_key,
      ].some((v) => v.toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  page = Math.min(page, pages - 1);
  $("work-rows").replaceChildren();
  for (const x of filtered.slice(page * size, (page + 1) * size)) {
    const tr = document.createElement("tr");
    const cell = (main, sub, cls = "") => {
      const td = document.createElement("td");
      const b = document.createElement("strong");
      b.textContent = main;
      b.className = cls;
      td.append(b);
      if (sub) {
        const a = document.createElement("small");
        a.textContent = sub;
        td.append(a);
      }
      tr.append(td);
      return td;
    };
    cell(x.first_name + " " + x.last_name, x.patient_id + " · " + x.case_key);
    cell(
      x.service_date.slice(5) + " · " + x.visit_time,
      x.service_type.replaceAll("_", " "),
    );
    cell(x.plan_name, x.member_id);
    cell(
      x.scenario_label.split(" · ")[0],
      "Scenario " + x.scenario,
      "scenario-label",
    );
    cell(x.location, "Needs verification");
    const td = document.createElement("td"),
      b = document.createElement("button");
    b.className = "row-open";
    b.dataset.case = x.case_key;
    b.textContent = "Open chart ↗";
    b.setAttribute(
      "aria-label",
      "Open chart for " + x.first_name + " " + x.last_name,
    );
    td.append(b);
    tr.append(td);
    $("work-rows").append(tr);
  }
  $("work-count").textContent =
    filtered.length.toLocaleString() +
    " visits match · " +
    inventory.length.toLocaleString() +
    " total";
  $("work-page").textContent = filtered.length
    ? "Showing " +
      (page * size + 1) +
      "–" +
      Math.min((page + 1) * size, filtered.length) +
      " of " +
      filtered.length.toLocaleString()
    : "No matching visits";
  $("work-prev").disabled = page === 0;
  $("work-next").disabled = page >= pages - 1;
  $("work-empty").hidden = filtered.length > 0;
}
for (const id of ["work-search", "work-scenario", "work-location"])
  $(id).addEventListener(id === "work-search" ? "input" : "change", () => {
    page = 0;
    draw();
  });
$("work-clear").onclick = () => {
  $("work-search").value = "";
  $("work-scenario").value = "all";
  $("work-location").value = "all";
  page = 0;
  draw();
};
$("work-prev").onclick = () => {
  page--;
  draw();
};
$("work-next").onclick = () => {
  page++;
  draw();
};
$("definitions-open").onclick = () => $("definitions-dialog").showModal();
$("definitions-close").onclick = () => $("definitions-dialog").close();
async function load() {
  try {
    const headers = { "Content-Type": "application/json" };
    if (window.LAB_ACCESS_TOKEN)
      headers["x-access-token"] = window.LAB_ACCESS_TOKEN;
    if (window.LAB_PUBLIC_KEY) {
      headers.apikey = window.LAB_PUBLIC_KEY;
      headers.Authorization = "Bearer " + window.LAB_PUBLIC_KEY;
    }
    const r = await fetch(window.LAB_API + "/worklist", {
      method: "POST",
      headers,
      body: "{}",
    });
    const data = await r.json();
    if (!r.ok || !Array.isArray(data.items))
      throw Error(data.error || "Worklist unavailable");
    inventory = data.items;
    const scenarioSelect = $("work-scenario");
    scenarioSelect.replaceChildren();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All 50 scenarios";
    scenarioSelect.append(all);
    for (const x of [
      ...new Map(inventory.map((x) => [x.scenario, x])).values(),
    ].sort((a, b) => a.scenario.localeCompare(b.scenario))) {
      const o = document.createElement("option");
      o.value = x.scenario;
      o.textContent = x.scenario + " · " + x.scenario_label;
      scenarioSelect.append(o);
    }
    draw();
  } catch (e) {
    $("work-count").textContent = e.message;
    $("work-empty").hidden = false;
    $("work-empty").querySelector("h3").textContent =
      "The worklist could not be loaded";
    $("work-empty").querySelector("p").textContent =
      "Reload to retry. The guided example remains available.";
  }
}
load();
