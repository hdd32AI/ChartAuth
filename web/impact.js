import { businessCase } from "./economics.mjs";
const $ = (id) => document.getElementById(id),
  keys = [
    "volume",
    "minutes",
    "rate",
    "realization",
    "monthlyCost",
    "setupCost",
  ],
  money = (x) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(x);
function update() {
  const inputs = Object.fromEntries(
      keys.map((k) => [k, Number($("roi-" + k).value)]),
    ),
    r = businessCase(inputs);
  keys.forEach(
    (k) =>
      ($("roi-" + k + "-value").textContent =
        k === "realization"
          ? inputs[k] + "%"
          : ["rate", "monthlyCost", "setupCost"].includes(k)
            ? money(inputs[k])
            : inputs[k].toLocaleString()),
  );
  $("roi-net").textContent = money(r.net);
  $("roi-net").classList.toggle("negative", r.net < 0);
  $("roi-percentage").textContent =
    r.roi === null ? "Not defined" : (r.roi * 100).toFixed(1) + "%";
  $("roi-payback").textContent =
    r.payback === null ? "No payback" : r.payback.toFixed(1) + " months";
  $("roi-hours").textContent = r.hours.toFixed(1) + " h / month";
  $("roi-capacity").textContent = money(r.capacityValue) + " / month";
  $("roi-realized").textContent = money(r.monthlyBenefit) + " / month";
  $("roi-cost").textContent = money(r.firstYearCost);
  $("roi-benefit").textContent = money(r.firstYearBenefit);
  const max = Math.max(r.firstYearCost, r.firstYearBenefit, 1);
  $("roi-cost-bar").style.width = (r.firstYearCost / max) * 100 + "%";
  $("roi-benefit-bar").style.width = (r.firstYearBenefit / max) * 100 + "%";
  $("roi-breakeven").textContent =
    r.breakEvenVolume === null
      ? "No operating break-even with these assumptions"
      : Math.ceil(r.breakEvenVolume).toLocaleString() +
        " checks / month to cover recurring cost";
}
keys.forEach((k) => $("roi-" + k).addEventListener("input", update));
update();
