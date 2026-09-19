function inquiry(r) {
  return {
    patient_id: r.patient.id,
    member_id: r.coverage.member_id,
    payer_id: r.coverage.payer_id,
    provider_id: r.visit.provider_id,
    service_type: r.visit.service_type,
    service_date: r.visit.service_date,
  };
}
export function suggestAssessment(records, response) {
  const q = inquiry(records),
    r = response;
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
