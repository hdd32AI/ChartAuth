export default `<!doctype html>
<html lang="en">
<head>
<script>(()=>{const b=document.createElement("base");b.href=location.pathname.startsWith("/chartauth")?"/chartauth/":"/";document.head.append(b)})();</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<title>ChartAuth</title>
<link rel="apple-touch-icon" href="/assets/ChartAuth_Avatar.png">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="experience.css">
<meta property="og:type" content="website">
<meta property="og:title" content="ChartAuth">
<meta property="og:image" content="https://chartauth.ai/assets/ChartAuth_Share_v2.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ChartAuth">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="ChartAuth">
<meta name="twitter:image" content="https://chartauth.ai/assets/ChartAuth_Share_v2.jpg">
<link rel="stylesheet" href="sources.css">
</head>
<body>
<header class="topbar">
<a href="#overview" class="brand" aria-label="ChartAuth home">
<img class="chartauth-mark" src="assets/mark.svg" width="32" height="32" alt="">
<span class="brand-stack">ChartAuth<small>AI</small>
</span>
</a>
<nav aria-label="Main navigation">
<button data-page="overview" class="navlink active">Experience</button>
<button data-page="worklist" class="navlink">Workspace</button>
<button data-page="research" class="navlink">Research</button>
<button data-page="production" class="navlink">Production</button>
<button data-page="impact" class="navlink">Impact</button>
<a href="notes" class="navlink">Specifications ↗</a>
</nav>
</header>
<main>
<section id="overview" class="page active">
 <div class="editorial-hero">
<span class="eyebrow">A HEALTHCARE OPERATIONS ENVIRONMENT</span>
<h1>Eligibility, built<br>
<em>around the patient.</em>
</h1>
<div class="hero-bottom">
<p>Help care teams resolve coverage questions before they become another handoff. ChartAuth connects the patient chart, current payer evidence and the next responsible team.</p>
<div class="hero-actions">
<div class="publication-links">
<a href="notes">Read the clinical workflow ↗</a>
<a href="https://github.com/hdd32AI/ChartAuth" target="_blank" rel="noreferrer">View the implementation ↗</a>
</div>
<button class="primary" id="watch-demo">Watch the walkthrough <span>↗</span>
</button>
<button class="textbutton" id="tour-start">Try the working environment</button>
</div>
</div>
</div>
 <section class="cinema" id="walkthrough" aria-labelledby="demo-heading">
<div class="cinema-heading">
<div>
<span class="eyebrow">THE WORKFLOW IN MOTION</span>
<h2 id="demo-heading">A chart becomes a supported result.</h2>
</div>
<span class="scene-tag">
<i>
</i>Interactive product walkthrough</span>
</div>
 <label class="tour-scenario-label" for="demo-scenario">Choose a workflow<select id="demo-scenario">
<option value="A">Authorization required</option>
<option value="CW0006">No authorization required</option>
<option value="CW0011">Out-of-network benefit</option>
<option value="CW0016">Authorization status missing</option>
<option value="CW0021">Cost share missing</option>
<option value="CW0026">Inactive coverage</option>
<option value="CW0031">Member mismatch</option>
<option value="CW0036">Service-date mismatch</option>
<option value="CW0041">Payer mismatch</option>
<option value="CW0046">Coverage unknown</option>
</select>
</label>
<div class="demo-stage" id="demo-stage">
<div class="demo-top">
<span class="demo-wordmark">ChartAuth<span> / Eligibility</span>
</span>
<span class="demo-live" id="demo-live">Illustrated workflow</span>
<span class="demo-clock">Monday, September 21</span>
</div>
<div class="demo-body">
<aside class="demo-sidebar">
<span class="demo-initial">JE</span>
<h3>Jordan Ellis</h3>
<p>Patient SYN-P1001</p>
<div class="demo-sidebar-nav">
<span class="selected">Patient chart</span>
<span>Insurance</span>
<span>Scheduled care</span>
<span>Activity</span>
</div>
<div class="demo-visit">
<small>NEXT VISIT</small>
<strong>Physical therapy</strong>
<span>Sep 21, 2026</span>
<span>Demo Orthopedics</span>
</div>
</aside>
<div class="demo-canvas">
<div class="demo-view" id="demo-view">
</div>
<div class="demo-cursor" id="demo-cursor" aria-hidden="true">
<svg viewBox="0 0 26 32">
<path d="M2 1L22 18L13 19L10 29Z" fill="#2355c4" stroke="white" stroke-width="2"/>
</svg>
<span>Eligibility review</span>
</div>
</div>
<aside class="demo-evidence">
<span class="mini-label">EVIDENCE TRAIL</span>
<h3 id="evidence-title">Start with the right person.</h3>
<div id="demo-trail">
</div>
<div class="demo-score" id="demo-score">
<span>Final reward</span>
<strong>Pending</strong>
</div>
<small>Fictional patient and payer. No live clinical connection.</small>
</aside>
</div>
<div class="demo-caption" aria-live="polite">
<span id="demo-step-no">01</span>
<p id="demo-caption">
</p>
</div>
</div>
 <div class="cinema-controls">
<button id="demo-play" class="player-button" aria-label="Play walkthrough">▶</button>
<button id="demo-restart" class="player-restart" aria-label="Restart walkthrough">↺</button>
<div class="demo-progress" role="progressbar" aria-label="Walkthrough progress" aria-valuemin="0" aria-valuemax="6" aria-valuenow="0">
<i id="demo-progress-bar">
</i>
</div>
<span id="demo-time">00:00 / 00:36</span>
<button id="demo-narrate" class="voice-control" aria-pressed="false">Narration off</button>
</div>
 <div class="chapter-tabs" role="tablist" aria-label="Walkthrough chapters">
<button role="tab" data-chapter="0" aria-selected="true">
<span>01</span>Review the chart</button>
<button role="tab" data-chapter="1" aria-selected="false">
<span>02</span>Send an inquiry</button>
<button role="tab" data-chapter="2" aria-selected="false">
<span>03</span>Read the response</button>
<button role="tab" data-chapter="3" aria-selected="false">
<span>04</span>Use the evidence</button>
<button role="tab" data-chapter="4" aria-selected="false">
<span>05</span>Save the result</button>
<button role="tab" data-chapter="5" aria-selected="false">
<span>06</span>Verify the work</button>
</div>
 <div class="demo-under">
<p>Watch the illustrated case, then run the same workflow against the hosted verifier.</p>
<button class="light-button" id="demo-try">Open this case <span>↗</span>
</button>
</div>
 </section>
 <section class="care-purpose">
<div class="section-label">DESIGNED AROUND THE NEXT CARE STEP</div>
<h2>Less uncertainty around care.<br>
<em>A clearer path for the people delivering it.</em>
</h2>
<div class="care-cards">
<article>
<span>01 / PATIENTS</span>
<h3>Understand the next step.</h3>
<p>Surface coverage questions early and give each unresolved issue a responsible team.</p>
</article>
<article>
<span>02 / CLINICIANS &amp; STAFF</span>
<h3>Keep the context together.</h3>
<p>Carry patient, service and benefit evidence through the handoff, with a result someone can check.</p>
</article>
<article>
<span>03 / VALUE-BASED CARE</span>
<h3>Build toward coordinated access.</h3>
<p>Test whether more reliable administration supports timely care and reduces avoidable rework.</p>
</article>
</div>
<details>
<summary>How the long-term value would be measured</summary>
<p>A future pilot would track coverage-related visit delays, time to resolve exceptions, staff effort and patient understanding, alongside realized costs. ChartAuth currently tests a fictional administrative workflow; improved clinical outcomes and lower total cost of care have not been demonstrated.</p>
<a href="https://www.cms.gov/priorities/innovation/key-concepts/value-based-care" target="_blank" rel="noreferrer">Value-based care: CMS context ↗</a>
</details>
</section>
<section class="decision-section">
<div class="section-label">01 / A SMALL CHANGE SHOULD CHANGE THE OUTCOME</div>
<div class="decision-layout">
<div>
<h2>The right benefits.<br>
<em>The wrong member.</em>
</h2>
<p>A payer can return active coverage for someone else. A useful environment checks whether the result belongs to this patient before crediting the answer.</p>
<div class="decision-choices" role="tablist" aria-label="Compare payer responses">
<button data-compare="A" role="tab" aria-selected="true">Active coverage</button>
<button data-compare="B" role="tab" aria-selected="false">Inactive coverage</button>
<button data-compare="C" role="tab" aria-selected="false">Member mismatch</button>
</div>
</div>
<div class="decision-card" id="decision-card">
</div>
</div>
<div class="plain-definition">
<b>Counterfactual case</b>
<span>Change one important fact. Check that the correct next action changes with it.</span>
</div>
</section>
 <section class="evidence-section">
<div class="section-label">02 / THE SCORE HAS TO RECOGNIZE THE WORK</div>
<div class="evidence-layout">
<div class="large-stat">
<strong>8<span>%</span>
</strong>
<p>precision in a submission<br>that still earned full credit</p>
</div>
<div>
<h2>A benchmark finding.<br>A design requirement.</h2>
<p>The inspected trial-matching evaluator accepted four correct IDs alongside 46 incorrect ones. That result shaped ChartAuth: a supported answer, the correct patient and a saved transaction must all agree.</p>
<button class="textbutton" data-page="research">Explore the six reproduced probes <span>↗</span>
</button>
<small>Controlled evaluator probes. No agent accuracy claim.</small>
</div>
</div>
</section>
 <section class="production-preview">
<div class="section-label">03 / BUILT FOR A TEAM TO REVIEW</div>
<div class="production-preview-head">
<h2>Clear enough to challenge.<br>
<em>Specific enough to build.</em>
</h2>
<p>The research paper defines the task, reward audit and production pipeline. The source makes one narrow workflow executable.</p>
</div>
<div class="deliverable-rows">
<a href="notes">
<span>01</span>
<div>
<h3>Read the research paper</h3>
<p>Environment, reward audit and end-to-end specification.</p>
</div>
<b>Read notes ↗</b>
</a>
<a href="https://github.com/hdd32AI/ChartAuth" target="_blank" rel="noopener noreferrer">
<span>02</span>
<div>
<h3>Inspect the runnable source</h3>
<p>50 scenarios, a verifier and executable checks.</p>
</div>
<b>Repository ↗</b>
</a>
<button data-page="production">
<span>03</span>
<div>
<h3>Explore the production plan</h3>
<p>Independent review, quality gates and editable cost assumptions.</p>
</div>
<b>Open ↗</b>
</button>
</div>
</section>
<section class="impact-section" id="impact">
<div class="section-label">04 / THE PRACTICE BUSINESS CASE</div>
<div class="impact-heading">
<h2>What would the work<br>
<em>be worth?</em>
</h2>
<p>Test the economics of a future deployment. Adjust the volume, time and costs. The model separates released labor capacity from benefit the practice can actually realize.</p>
</div>
<div class="impact-grid">
<div class="impact-inputs">
<label for="roi-volume">Monthly eligibility checks<output id="roi-volume-value">
</output>
<input id="roi-volume" type="range" min="100" max="10000" step="100" value="1000">
</label>
<label for="roi-minutes">Net minutes saved per check<output id="roi-minutes-value">
</output>
<input id="roi-minutes" type="range" min="0" max="20" step="0.5" value="5">
</label>
<label for="roi-rate">Loaded hourly labor cost<output id="roi-rate-value">
</output>
<input id="roi-rate" type="range" min="15" max="100" step="1" value="35">
</label>
<label for="roi-realization">Capacity converted to economic benefit<output id="roi-realization-value">
</output>
<input id="roi-realization" type="range" min="0" max="100" step="5" value="70">
</label>
<label for="roi-monthlyCost">Monthly operating cost<output id="roi-monthlyCost-value">
</output>
<input id="roi-monthlyCost" type="range" min="0" max="10000" step="100" value="1000">
</label>
<label for="roi-setupCost">One-time implementation cost<output id="roi-setupCost-value">
</output>
<input id="roi-setupCost" type="range" min="0" max="50000" step="500" value="6000">
</label>
</div>
<div class="impact-results">
<span class="mini-label">ILLUSTRATIVE FIRST-YEAR NET BENEFIT</span>
<strong id="roi-net">
</strong>
<div class="impact-kpis">
<div>
<span>First-year ROI</span>
<b id="roi-percentage">
</b>
</div>
<div>
<span>Simple payback</span>
<b id="roi-payback">
</b>
</div>
</div>
<div class="impact-bars">
<div>
<span>Realized benefit</span>
<b id="roi-benefit">
</b>
</div>
<i>
<u id="roi-benefit-bar">
</u>
</i>
<div>
<span>Implementation + operating cost</span>
<b id="roi-cost">
</b>
</div>
<i>
<u id="roi-cost-bar">
</u>
</i>
</div>
<div class="impact-capacity">
<p>Released capacity <b id="roi-hours">
</b>
</p>
<p>Gross capacity value <b id="roi-capacity">
</b>
</p>
<p>Realized economic benefit <b id="roi-realized">
</b>
</p>
</div>
<small id="roi-breakeven">
</small>
</div>
</div>
<details class="impact-method">
<summary>Assumptions, formulas and source context</summary>
<p>All calculator defaults are illustrative planning assumptions, not measured ChartAuth results. Net time saved must include human review and exception handling. Released hours become cash savings only when they reduce actual spending; otherwise they are capacity. No denial reduction or revenue recovery is added.</p>
<p>Monthly capacity value = checks × net minutes saved ÷ 60 × loaded hourly cost. Realized benefit = capacity value × realization rate. First-year net benefit = 12 × realized monthly benefit − 12 × monthly operating cost − implementation cost. ROI = net benefit ÷ first-year total cost. Payback = implementation cost ÷ positive monthly net benefit; zero or negative monthly net benefit has no payback.</p>
<p>The <a href="https://www.dataspring.com/advisory-services/index-report" target="_blank" rel="noreferrer">2025 DataSpring Index overview, powered by CAQH</a> frames administrative automation as an industry savings opportunity. Its industry figures are context only and are not inputs to this calculator. This is a simple undiscounted model; taxes, financing, ramp-up, integration overruns and quality effects are not modeled. Training-data production costs are shown separately under Production.</p>
</details>
</section> <section class="prepared-for">
<div>
<span class="section-label">HEALTHCARE PRACTICE × SUPERVISED LEARNING</span>
<p>Eligibility. Evidence. Accountable handoffs.</p>
</div>
<div class="partner-lockup">
<a href="https://www.flaglerhealth.io/" target="_blank" rel="noreferrer">
<img src="assets/flagler.png" alt="Flagler">
</a>
<span class="partner-cross" aria-hidden="true">×</span>
<a href="https://www.alaskalabs.ai/" target="_blank" rel="noreferrer">
<img src="assets/alaska.png" alt="Alaska AI">
</a>
</div>
<small>Reference organizations; no affiliation or endorsement.</small>
</section>
</section>
<section id="worklist" class="page">
 <div id="queue-view">
<div class="pageheading">
<div>
<div class="eyebrow">PRE-VISIT OPERATIONS</div>
<h1>Eligibility worklist</h1>
<p>Find a visit, review the chart and complete its eligibility check. Every visit opens an independent episode. The inventory spans 50 scenario templates across ten operating conditions and five service types.</p>
</div>
<button class="secondary" id="queue-tour">Start guided walkthrough</button>
</div>
<div class="emr-context">
<div>
<span class="section-label">DEMO ORTHOPEDICS</span>
<h2>Pre-visit operations</h2>
<p>September 21–27, 2026 · Outpatient patient access</p>
</div>
<div class="inventory-metric">
<strong>1,000</strong>
<span>fictional visits</span>
</div>
<div class="inventory-metric">
<strong>50</strong>
<span>scenario templates</span>
</div>
</div>
<div class="worklist-tools">
<label class="work-search">Search the worklist<input id="work-search" placeholder="Patient, member ID or visit ID" type="search">
</label>
<label>Scenario<select id="work-scenario">
<option value="all">Loading 50 scenarios…</option>
</select>
</label>
<label>Location<select id="work-location">
<option value="all">All clinics</option>
<option>North clinic</option>
<option>Central clinic</option>
<option>South clinic</option>
</select>
</label>
<button class="secondary compact" id="work-clear">Clear filters</button>
</div>
<div class="worklist-status">
<span id="work-count" role="status">Loading visits…</span>
<span>Reviewer view · Scenario labels visible</span>
</div>
<div class="worklist-scroll">
<table class="work-table">
<thead>
<tr>
<th>Patient and chart</th>
<th>Appointment</th>
<th>Coverage</th>
<th>Scenario</th>
<th>Location</th>
<th>
</th>
</tr>
</thead>
<tbody id="work-rows">
</tbody>
</table>
</div>
<div class="worklist-pagination">
<button class="secondary compact" id="work-prev">← Previous</button>
<span id="work-page">
</span>
<button class="secondary compact" id="work-next">Next →</button>
</div>
<div class="worklist-empty" id="work-empty" hidden>
<h3>No visits match these filters</h3>
<p>Try a different patient name, scenario or clinic.</p>
</div>
</div>
 <div id="case-view" hidden>
<div class="case-toolbar">
<button class="textbutton" id="back-queue">← Worklist</button>
<span id="case-title">
</span>
<div class="toolbar-right">
<label class="toggle">
<input type="checkbox" id="guided"> Guided walkthrough</label>
<button id="reset-case" class="secondary compact">New episode</button>
</div>
</div>
 <div class="patient-banner">
<div class="avatar" id="patient-avatar">JE</div>
<div>
<h2>
<span id="patient-name">Jordan Ellis</span> <span>Synthetic patient</span>
</h2>
<p id="patient-line">
</p>
</div>
<div class="patient-banner-right">
<small>EPISODE STATUS</small>
<strong id="status-label">Loading</strong>
<span id="episode-short">
</span>
</div>
</div>
 <div class="encounter-context" id="encounter-context">
</div>
<div class="stagebar" aria-label="Workflow progress">
<div data-stage="1">
<b>1</b>Inquiry</div>
<div data-stage="2">
<b>2</b>Payer response</div>
<div data-stage="3">
<b>3</b>Assessment</div>
<div data-stage="4">
<b>4</b>Saved record</div>
</div>
 <div id="guide-banner" class="guide-banner" hidden>
<span class="guide-step">WALKTHROUGH</span>
<p id="guide-text">
</p>
<button id="guide-next" class="primary compact">
</button>
</div>
 <div id="notice" role="status" aria-live="polite" hidden>
</div>
 <div class="clinical-grid">
<aside class="chart-pane">
<div class="pane-title">
<h3>Patient chart</h3>
<span>Read only</span>
</div>
<div class="chart-tabs" role="tablist" aria-label="Chart sections" aria-orientation="horizontal">
<button type="button" id="chart-tab-patient" data-chart="patient" class="active" role="tab" aria-selected="true" aria-controls="chart-content" tabindex="0">Patient</button>
<button type="button" id="chart-tab-coverage" data-chart="coverage" role="tab" aria-selected="false" aria-controls="chart-content" tabindex="-1">Coverage</button>
<button type="button" id="chart-tab-visit" data-chart="visit" role="tab" aria-selected="false" aria-controls="chart-content" tabindex="-1">Visit</button>
<button type="button" id="chart-tab-policy" data-chart="policy" role="tab" aria-selected="false" aria-controls="chart-content" tabindex="-1">Policy</button>
</div>
<div id="chart-content" role="tabpanel" aria-labelledby="chart-tab-patient" tabindex="0">
</div>
<details class="raw">
<summary>Source record and fingerprint</summary>
<pre id="chart-json">
</pre>
</details>
</aside>
 <div class="task-pane">
<section class="inquiry-section">
<div class="pane-title">
<div>
<span class="eyebrow">01 / INQUIRY</span>
<h3>Check current eligibility</h3>
</div>
<button id="prefill-query" class="textbutton">Fill from chart</button>
</div>
<p class="section-help">Use the member and service information attached to this visit.</p>
<form id="query-form">
<div class="form-grid" id="query-fields">
</div>
<div class="form-footer">
<span id="query-state">No inquiry sent</span>
<button id="send-query" class="primary" type="submit">Send eligibility inquiry</button>
</div>
</form>
</section>
 <section id="response-section" class="response-section">
<div class="pane-title">
<div>
<span class="eyebrow">02 / PAYER RESPONSE</span>
<h3>Benefits for this visit</h3>
</div>
<button id="poll" class="secondary compact" disabled>Check response</button>
</div>
<div id="response-content" class="empty-state">
<span class="empty-symbol">↔</span>
<strong>Waiting for an inquiry</strong>
<p>The response will appear here, with a transaction reference.</p>
</div>
</section>
 <section id="assessment-section" class="assessment-section">
<div class="pane-title">
<div>
<span class="eyebrow">03 / ASSESSMENT</span>
<h3>Document the eligibility result</h3>
</div>
<button id="prefill-assessment" class="textbutton" disabled>Use response values</button>
</div>
<p class="section-help">Unknown benefits stay unknown. An identity mismatch needs resolution before benefits can be used.</p>
<form id="assessment-form">
<div class="form-grid" id="assessment-fields">
</div>
<details class="assurance">
<summary>Test an unsupported claim</summary>
<label>
<input type="checkbox" id="payment-guarantee"> Mark payment as guaranteed</label>
<small>Check whether the verifier rejects a claim absent from the payer response.</small>
</details>
<div class="source-linked" id="evidence-status">Source references attach when you prepare the assessment.</div>
<div class="form-footer">
<span id="assessment-state">No assessment prepared</span>
<button id="prepare" class="secondary" type="submit" disabled>Prepare assessment</button>
</div>
</form>
</section>
 </div>
<aside class="activity-pane">
<div class="pane-title">
<h3>Episode activity</h3>
<button id="export" class="textbutton">Export</button>
</div>
<div class="episode-meter">
<span id="action-count">0 / 40 actions</span>
<span id="elapsed">00:00</span>
</div>
<ol id="events" class="timeline">
</ol>
<div id="saved-record" hidden>
</div>
<div id="result" hidden>
</div>
<div class="action-dock">
<button id="save" class="primary" disabled>Save eligibility record</button>
<button id="finish" class="secondary" disabled>Finish and verify</button>
<p>Saving writes a mock record. Finishing asks the verifier to grade this episode.</p>
</div>
</aside>
</div>
 </div>
</section>
<section id="research" class="page">
<div class="pageheading">
<div>
<div class="eyebrow">EVALUATION RESEARCH</div>
<h1>When the score misses the work</h1>
<p>A reproducible audit of HealthAgentBench clinical trial matching Task 19. This is evaluator behavior measured with synthetic IDs, not an agent performance claim.</p>
</div>
</div>
<div class="research-layout">
<div class="research-controls">
<label for="probe">Explore a tested submission</label>
<select id="probe">
<option value="0">Exactly the four eligible IDs</option>
<option value="1">Four eligible + 46 incorrect IDs</option>
<option value="2">All 301 IDs, eligible ones first</option>
<option value="3">All 301 IDs, eligible ones last</option>
<option value="4">Eligible IDs inside negated sentences</option>
<option value="5">Eligible IDs + 100 unknown IDs</option>
</select>
<p id="probe-explanation">
</p>
<div class="metric-pair">
<div>
<span>Reward</span>
<strong id="probe-reward">
</strong>
</div>
<div>
<span>Precision</span>
<strong id="probe-precision">
</strong>
</div>
</div>
<p class="quiet">Precision = correct retained IDs ÷ all retained IDs.</p>
</div>
<div class="probe-visual">
<div class="plot-title">
<h3>What the evaluator retains</h3>
<span id="probe-count">
</span>
</div>
<div id="id-grid" aria-label="Retained predictions">
</div>
<div class="legend">
<span>
<i class="gold">
</i>Eligible ID</span>
<span>
<i>
</i>Incorrect ID</span>
</div>
<p id="rank-note">
</p>
</div>
</div>
<div class="research-conclusion">
<h2>Reward should require the intended result.</h2>
<p>The inspected evaluator awards full reward when all four eligible IDs appear in the first 50 retained predictions. Precision is reported but does not gate success. Unknown IDs disappear, and text containing a negated ID can still count as a prediction.</p>
<p>A stricter parser and an appropriate set check repair specific failures. A reviewed reference and a protected evaluation environment remain necessary.</p>
</div>
<details class="research-sources">
<summary>Inspection boundaries and source links</summary>
<p>Static inspection at commit bcbb8085fd549469e2dc7455f4bfd68a1b98895a. The full benchmark harness was not run. Public-label retrieval is a leakage threat, not a demonstrated sandbox exploit.</p>
<a href="https://github.com/microsoft/HealthAgentBench/tree/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19" target="_blank" rel="noreferrer">Inspect the pinned task</a>
</details>
</section>
<section id="production" class="page">
<div class="pageheading">
<div>
<div class="eyebrow">PRODUCTION DESIGN</div>
<h1>How an episode becomes training data</h1>
<p>The sample makes one workflow concrete. Production requires reviewed reference answers, protected sources and repeatable release gates.</p>
</div>
</div>
<div class="production-grid">
<div class="vertical-flow">
<article>
<b>01</b>
<div>
<h3>Prepare the source</h3>
<p>Use fictional records first. Real charts need authorized use, de-identification and a review of free text, attachments and filenames.</p>
</div>
</article>
<article>
<b>02</b>
<div>
<h3>Author and label independently</h3>
<p>An operations analyst drafts the episode. Two reviewers label the correct outcome without seeing each other's answers.</p>
</div>
</article>
<article>
<b>03</b>
<div>
<h3>Resolve disagreements</h3>
<p>Measure agreement before adjudication. An eligibility specialist resolves conflicts and versions changed rules. Unresolved cases stay quarantined.</p>
</div>
</article>
<article>
<b>04</b>
<div>
<h3>Release after adversarial checks</h3>
<p>Require the reference to pass, critical mutations to fail, clean resets and no hidden-label exposure. Keep related cases in the same data split.</p>
</div>
</article>
</div>
<div class="cost-panel">
<div class="eyebrow">EDITABLE PLANNING ASSUMPTIONS</div>
<h2>Cost per accepted episode</h2>
<div class="cost-tabs">
<button id="cost-start" class="active">At start</button>
<button id="cost-mature">After 500</button>
</div>
<label for="author-min">Authoring minutes <output id="author-value">60</output>
<input id="author-min" type="range" min="10" max="90" value="60" step="5">
</label>
<label for="yield">Accepted yield <output id="yield-value">85%</output>
<input id="yield" type="range" min="50" max="100" value="85">
</label>
<div class="cost-result">
<strong id="cost-total">$160.29</strong>
<span>Variable cost per accepted episode</span>
</div>
<div class="cost-breakdown" id="cost-breakdown">
</div>
<p class="quiet">Planning estimates, not measured production results. Both reviewers remain in the process. A separate $6,000 setup allocation over 500 adds $12 per episode.</p>
</div>
</div>
<div class="design-foot">
<h2>What scales first, and what breaks first</h2>
<p>At 200 workflows across four EHRs, there are up to 800 workflow/interface combinations before payer and specialty variation. Shared rules and versioned adapters reduce duplication. Policy maintenance, verifier correctness and reviewer calibration are the expected constraints to measure in a 50-episode pilot.</p>
<p>
<strong>Reference quality comes first.</strong> Deterministic checks can consistently reward a bad answer if the reference is wrong. Public demonstrations cannot establish held-out accuracy.</p>
</div>
</section>
<dialog id="definitions-dialog">
<button id="definitions-close" class="secondary">Close</button>
<h2>A few useful definitions</h2>
<dl>
<dt>Eligibility</dt>
<dd>Whether coverage and benefits apply to this person, service and date.</dd>
<dt>Authorization</dt>
<dd>A separate payer review required before some services.</dd>
<dt>Episode</dt>
<dd>One attempt at completing the workflow.</dd>
<dt>Verifier</dt>
<dd>The checks used to decide whether the work is complete and supported.</dd>
<dt>Provenance</dt>
<dd>The source of a fact and the changes made to it.</dd>
</dl>
</dialog>
</main>
<footer>
<a href="notes">Specifications</a>
<a href="notes#notes">Project notes</a>
<a href="notes#sources">Sources &amp; technology</a>
<button id="definitions-open">Key definitions</button>
<span>ChartAuth © 2026</span>
</footer>
<script>window.LAB_ACCESS_TOKEN=localStorage.getItem("chartauth_access")||"";</script>
<script src="config.js">
</script>
<script type="module" src="app.js">
</script>
<script type="module" src="experience.js">
</script>
<script type="module" src="worklist.js">
</script>
<script type="module" src="impact.js">
</script>
</body>
</html>
`;
