const records = {
  patient: {
    id: "SYN-P1001",
    version: 1,
    first_name: "Jordan",
    last_name: "Ellis",
    dob: "1984-05-14",
    sex: "X",
    phone: "Not collected in this sample",
    synthetic: true,
  },
  coverage: {
    id: "SYN-C401",
    version: 1,
    patient_id: "SYN-P1001",
    member_id: "SYN-M401",
    payer_id: "DEMO_HEALTH",
    plan_name: "Demo Select PPO",
    subscriber_relationship: "self",
    card_received: "2026-09-18",
    verification_status: "unverified",
  },
  visit: {
    id: "SYN-V501",
    version: 1,
    patient_id: "SYN-P1001",
    provider_id: "SYN-PROVIDER-01",
    provider_name: "Demo Orthopedics",
    service_type: "physical_therapy",
    service_date: "2026-09-21",
    location: "Outpatient clinic",
    reason: "Left knee rehabilitation",
    status: "scheduled",
  },
  policy: {
    id: "ELIG_DEMO_V1",
    version: 1,
    fictional: true,
    scope: "Eligibility and benefits review only",
    rules: [
      "Match patient, member, payer, provider, service and date before using benefits.",
      "A fresh payer response is required for this work item.",
      "Record active or inactive coverage only when the response identity matches.",
      "Unknown or mismatched identity requires a registration handoff.",
      "Active coverage with authorization required routes to the authorization team.",
      "Eligibility is not authorization or a guarantee of payment.",
    ],
  },
};
const response = {
  id: "SYN-R601",
  version: 1,
  patient_id: "SYN-P1001",
  member_id: "SYN-M401",
  payer_id: "DEMO_HEALTH",
  provider_id: "SYN-PROVIDER-01",
  service_type: "physical_therapy",
  service_date: "2026-09-21",
  lookup_status: "matched",
  coverage_status: "active",
  network_status: "in_network",
  copay: 30,
  currency: "USD",
  authorization_required: true,
  payment_guaranteed: false,
  benefit_note:
    "Fictional benefit terms for this service and date. Final payment depends on the claim and plan terms.",
};
export const fixtures = Object.fromEntries(
  ["A", "B", "C"].map((key) => {
    const r = structuredClone(response);
    if (key === "B") r.coverage_status = "inactive";
    if (key === "C") r.member_id = "SYN-M999";
    return [key, { key, records: structuredClone(records), payer_response: r }];
  }),
);

export function expectedInquiry(r) {
  return {
    patient_id: r.patient.id,
    member_id: r.coverage.member_id,
    payer_id: r.coverage.payer_id,
    provider_id: r.visit.provider_id,
    service_type: r.visit.service_type,
    service_date: r.visit.service_date,
    dob: r.patient.dob,
    last_name: r.patient.last_name,
  };
}
export function expectedFields(f) {
  const q = expectedInquiry(f.records),
    r = f.payer_response;
  const identity =
    r.member_id !== q.member_id ||
    r.patient_id !== q.patient_id ||
    r.lookup_status !== "matched";
  const binding =
    r.payer_id !== q.payer_id ||
    r.provider_id !== q.provider_id ||
    r.service_type !== q.service_type ||
    r.service_date !== q.service_date;
  const inactive = r.coverage_status === "inactive",
    unknown = r.coverage_status !== "active" && !inactive;
  const unusable = identity || binding || inactive || unknown;
  let disposition = "verified",
    next_owner = "authorization_team",
    next_action = "start_prior_authorization";
  if (identity) {
    disposition = "identity_review";
    next_owner = "registration";
    next_action = "resolve_member_identity";
  } else if (binding) {
    disposition = "response_review";
    next_owner = "benefits_team";
    next_action = "request_corrected_response";
  } else if (inactive) {
    disposition = "coverage_issue";
    next_owner = "registration";
    next_action = "request_updated_coverage";
  } else if (unknown) {
    disposition = "benefit_review";
    next_owner = "benefits_team";
    next_action = "clarify_coverage";
  } else if (r.network_status !== "in_network") {
    disposition = "benefit_review";
    next_owner = "benefits_team";
    next_action = "review_network_options";
  } else if (r.authorization_required === null) {
    disposition = "benefit_review";
    next_action = "clarify_authorization";
  } else if (r.copay === null) {
    disposition = "benefit_review";
    next_owner = "benefits_team";
    next_action = "request_cost_share";
  } else if (r.authorization_required === false) {
    next_owner = "scheduling";
    next_action = "confirm_visit_readiness";
  }
  return {
    patient_id: q.patient_id,
    member_id: q.member_id,
    payer_id: q.payer_id,
    provider_id: q.provider_id,
    service_type: q.service_type,
    service_date: q.service_date,
    coverage_status:
      identity || binding || unknown ? "unknown" : r.coverage_status,
    network_status: unusable ? "unknown" : r.network_status,
    copay: unusable ? null : r.copay,
    authorization_required: unusable ? null : r.authorization_required,
    payment_guaranteed: false,
    disposition,
    next_owner,
    next_action,
  };
}

// Fictional templates vary benefit requirements and response identity or scope.
const firstNames = [
  "Avery",
  "Morgan",
  "Riley",
  "Casey",
  "Quinn",
  "Rowan",
  "Taylor",
  "Cameron",
  "Parker",
  "Reese",
  "Hayden",
  "Jordan",
  "Sage",
  "Emerson",
  "Finley",
  "Alex",
  "Blair",
  "Drew",
  "Elliot",
  "Harper",
];
const lastNames = [
  "Bennett",
  "Brooks",
  "Carter",
  "Collins",
  "Davis",
  "Ellis",
  "Foster",
  "Gray",
  "Hayes",
  "Hughes",
  "Lane",
  "Lee",
  "Morgan",
  "Parker",
  "Reed",
  "Rivera",
  "Scott",
  "Shaw",
  "Stone",
  "Wells",
  "Adams",
  "Bailey",
  "Bell",
  "Clark",
  "Cooper",
  "Evans",
  "Green",
  "Hall",
  "Hill",
  "James",
  "Kelly",
  "King",
  "Lewis",
  "Long",
  "Martin",
  "Moore",
  "Morris",
  "Nelson",
  "Perry",
  "Price",
  "Reynolds",
  "Ross",
  "Sanders",
  "Smith",
  "Taylor",
  "Thomas",
  "Turner",
  "Walker",
  "Ward",
  "Young",
];

const families = [
  ["authorization_required", "Authorization required"],
  ["authorization_not_required", "No authorization required"],
  ["out_of_network", "Out-of-network benefit"],
  ["authorization_unknown", "Authorization status missing"],
  ["cost_share_missing", "Cost share missing"],
  ["coverage_inactive", "Inactive coverage"],
  ["member_mismatch", "Member mismatch"],
  ["service_date_mismatch", "Service-date mismatch"],
  ["payer_mismatch", "Payer mismatch"],
  ["coverage_unknown", "Coverage unknown"],
];
const services = [
  "physical_therapy",
  "occupational_therapy",
  "office_visit",
  "specialist_consultation",
  "diagnostic_lab",
];
export const scenarios = families.flatMap(([family, label], g) =>
  Array.from({ length: 5 }, (_, j) => ({
    id: "S" + String(g * 5 + j + 1).padStart(2, "0"),
    family,
    label: label + " · " + services[j].replaceAll("_", " "),
    service_type: services[j],
    copay: [0, 15, 30, 45, 60][j],
  })),
);
export const worklist = Array.from({ length: 1000 }, (_, i) => {
  const n = i + 1,
    pad = (v) => String(v).padStart(2, "0"),
    t = scenarios[i % 50];
  return {
    case_key: "CW" + String(n).padStart(4, "0"),
    scenario: t.id,
    scenario_family: t.family,
    scenario_label: t.label,
    first_name: firstNames[i % 20],
    last_name: lastNames[Math.floor(i / 20)],
    patient_id: "SYN-P" + (10000 + n),
    member_id: "SYN-M" + (20000 + n),
    dob: 1965 + (i % 40) + "-" + pad(1 + (i % 12)) + "-" + pad(1 + (i % 27)),
    service_date: "2026-09-" + pad(21 + (i % 7)),
    visit_time: pad(8 + (Math.floor(i / 4) % 9)) + ":" + pad((i % 4) * 15),
    plan_name: ["Demo Select PPO", "Demo Choice PPO", "Demo Access PPO"][
      Math.floor(i / 7) % 3
    ],
    location: ["North clinic", "Central clinic", "South clinic"][
      Math.floor(i / 3) % 3
    ],
    service_type: t.service_type,
    status: "Needs verification",
  };
});
for (const item of worklist) {
  const t = scenarios.find((x) => x.id === item.scenario),
    f = structuredClone(fixtures.A);
  f.key = item.case_key;
  Object.assign(f.records.patient, {
    id: item.patient_id,
    first_name: item.first_name,
    last_name: item.last_name,
    dob: item.dob,
  });
  Object.assign(f.records.coverage, {
    id: "C-" + item.case_key,
    patient_id: item.patient_id,
    member_id: item.member_id,
    plan_name: item.plan_name,
  });
  Object.assign(f.records.visit, {
    id: "V-" + item.case_key,
    patient_id: item.patient_id,
    service_date: item.service_date,
    service_type: item.service_type,
    location: item.location,
    reason: "Scheduled " + item.service_type.replaceAll("_", " "),
  });
  f.records.policy = {
    id: "ELIG_DEMO_V2",
    version: 2,
    fictional: true,
    scope: "Eligibility and benefit handoff; no clinical or payment decision",
    rules: [
      "Match patient, member and successful lookup before using any returned benefits. Otherwise keep all benefits unknown and route identity review to registration.",
      "Match payer, provider, service and date. If response scope differs, keep benefits unknown and ask the benefits team for a corrected response.",
      "Inactive coverage retains inactive status; usable network, copay and authorization stay unknown. Registration requests updated coverage.",
      "Unknown coverage means all benefits remain unknown. The benefits team clarifies coverage.",
      "Active coverage outside the confirmed network needs benefits-team review of network options. Preserve returned benefit fields without promising coverage or price.",
      "Missing authorization status goes to the authorization team for clarification. Missing copay goes to the benefits team for cost-share clarification.",
      "Active matching in-network coverage with authorization required goes to the authorization team. With authorization explicitly not required, scheduling confirms visit readiness.",
      "These are fictional service-specific rules. Eligibility never grants authorization or guarantees payment.",
    ],
  };
  Object.assign(f.payer_response, {
    id: "R-" + item.case_key,
    patient_id: item.patient_id,
    member_id: item.member_id,
    service_date: item.service_date,
    service_type: item.service_type,
    copay: t.copay,
  });
  switch (t.family) {
    case "authorization_not_required":
      f.payer_response.authorization_required = false;
      break;
    case "out_of_network":
      f.payer_response.network_status = "out_of_network";
      break;
    case "authorization_unknown":
      f.payer_response.authorization_required = null;
      break;
    case "cost_share_missing":
      f.payer_response.copay = null;
      break;
    case "coverage_inactive":
      f.payer_response.coverage_status = "inactive";
      break;
    case "member_mismatch":
      f.payer_response.member_id = "SYN-UNMATCHED-" + item.case_key;
      break;
    case "service_date_mismatch":
      f.payer_response.service_date = "2026-09-01";
      break;
    case "payer_mismatch":
      f.payer_response.payer_id = "OTHER_DEMO_PAYER";
      break;
    case "coverage_unknown":
      f.payer_response.coverage_status = "unknown";
      break;
  }
  fixtures[item.case_key] = f;
}
