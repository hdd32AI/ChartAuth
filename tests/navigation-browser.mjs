// Diagnostic only: the blocking tests/mobile-browser.mjs gate remains unchanged.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const base = 'http://127.0.0.1:4175';
const out = 'artifacts/mobile-ui/navigation';
const variants = ['current', 'unrouteAll-wait', 'no-interception', 'manual-history'];
const worker = process.argv.includes('--variant');
const variant = process.argv[process.argv.indexOf('--variant') + 1];
const reports = [];
await mkdir(out, { recursive: true });

async function ready(page) {
  await page.waitForSelector('html.mobile-ready');
  await Promise.race([page.evaluate(() => document.fonts.ready), page.waitForTimeout(5000)]);
  await page.waitForTimeout(120);
}
async function audit(page, label, mobile = true) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth, header = document.querySelector('.mobile-header');
    const brand = header.querySelector('.brand, .reader-brand'), button = header.querySelector('.mobile-menu-toggle');
    const b = brand.getBoundingClientRect(), h = header.getBoundingClientRect(), t = button.getBoundingClientRect();
    const rect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    const offenders = [...document.querySelectorAll('main *')].filter((node) => {
      if (node.closest('.mobile-table-scroll, thead, [hidden]')) return false;
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > width + 1);
    }).slice(0, 12).map((node) => ({ tag: node.tagName, id: node.id, class: String(node.className), rect: rect(node.getBoundingClientRect()) }));
    const sectionControls = [...header.querySelectorAll('.mobile-progress-step')].map((control) => {
      const id = control.getAttribute('aria-controls');
      const matches = [...document.querySelectorAll('[id]')].filter((node) => node.id === id);
      const target = matches[0];
      return { id, count: matches.length, visible: !!target && !target.closest('[hidden]') && target.getClientRects().length > 0 };
    });
    return { width, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, sectionControls,
      centeredBy: Math.abs((b.left + b.right) / 2 - width / 2), header: rect(h), brand: rect(b), toggle: rect(t),
      sticky: getComputedStyle(header).position, progressCount: header.querySelectorAll('.mobile-progress-step').length,
      rootOverflow: getComputedStyle(document.documentElement).overflowX, menuHidden: header.querySelector('.mobile-main-menu').hidden, offenders };
  });
  const expectedWidth = page.viewportSize().width;
  reports.push({ label, expectedWidth, ...result }); console.log(`AUDIT ${label}`);
  assert.ok(result.documentWidth <= expectedWidth + 1, `${label}: document overflows ${JSON.stringify(result)}`);
  assert.ok(result.bodyWidth <= expectedWidth + 1, `${label}: body overflows`);
  if (mobile) {
    assert.ok(result.centeredBy <= 1.5, `${label}: brand center is ${result.centeredBy}px off`);
    assert.equal(result.sticky, 'sticky', `${label}: header is not sticky`);
    assert.ok(result.brand.right <= result.toggle.left + 1, `${label}: menu overlaps brand`);
    assert.ok(result.progressCount >= 3 && result.progressCount <= 6, `${label}: missing section navigation`);
    assert.ok(result.sectionControls.every((target) => target.count === 1 && target.visible), `${label}: section controls must target one visible section: ${JSON.stringify(result.sectionControls)}`);
    assert.ok(!['hidden', 'clip'].includes(result.rootOverflow), `${label}: root overflow is masked rather than fixed`);
  }
}
async function shot(page, name) { await page.screenshot({ path: `${out}/${name}.png`, fullPage: false, animations: 'disabled' }); }
async function auditSpecificationsHero(page, label) {
  const layout = await page.evaluate(() => {
    const header = document.querySelector('.reader-header').getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    return { width, headerBottom: header.bottom, content: ['.paper-hero h1', '.paper-hero .paper-deck'].map((selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { selector, left: r.left, right: r.right, top: r.top };
    }) };
  });
  for (const item of layout.content) {
    assert.ok(item.left >= 16 && item.right <= layout.width - 16, `${label}: specifications hero lacks readable side insets: ${JSON.stringify(layout)}`);
    assert.ok(item.top >= layout.headerBottom + 16, `${label}: specifications hero touches the header: ${JSON.stringify(layout)}`);
  }
  reports.push({ label: `${label}-hero-insets`, ...layout });
}

async function probe(name) {
  const engineName = `webkit-${name}`;
  const started = Date.now();
  const state = { variant: name, started: new Date().toISOString(), outcome: 'running', stage: 'launch', stages: [], events: [], reports };
  const desktopErrors = [], desktopSteps = [];
  state.browserErrors = desktopErrors;
  state.steps = desktopSteps;
  let writes = Promise.resolve();
  const persist = () => {
    const snapshot = JSON.stringify(state, null, 2);
    writes = writes.then(() => writeFile(`${out}/${name}.json`, snapshot));
    return writes;
  };
  const event = (kind, detail) => {
    state.events.push({ kind, elapsedMs: Date.now() - started, detail });
    console.log(`NAV_DIAGNOSTIC_EVENT ${name}: ${kind} ${JSON.stringify(detail)}`);
    void persist().catch(() => {});
  };
  const stage = (label) => {
    state.stage = label;
    state.stages.push({ label, elapsedMs: Date.now() - started });
    console.log(`NAV_DIAGNOSTIC_STAGE ${name}: ${label}`);
    void persist().catch(() => {});
  };
  let browser, desktop;
  try {
    stage('launch');
    browser = await webkit.launch({ timeout: 10000 });
    state.browserVersion = browser.version();
    browser.on('disconnected', () => event('browser-disconnected', 'WebKit browser disconnected'));
    desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    if (name === 'manual-history') {
      await desktop.addInitScript(() => { history.scrollRestoration = 'manual'; });
    }
    desktop.on('crash', () => event('crash', 'WebKit page process crashed'));
    desktop.on('pageerror', (error) => { desktopErrors.push(error.message); event('pageerror', error.message); });
    desktop.on('console', (message) => { if (['warning', 'error'].includes(message.type())) event(`console-${message.type()}`, message.text()); });
    desktop.on('requestfailed', (request) => event('requestfailed', { url: request.url(), error: request.failure()?.errorText }));
    desktop.on('request', (request) => {
      if (request.url().endsWith('/api/step')) {
        const entry = { event: 'request', type: request.postDataJSON()?.type };
        desktopSteps.push(entry); event('api-step', entry);
      }
    });
    desktop.on('response', async (response) => {
      if (response.status() >= 400) event('http-error', { url: response.url(), status: response.status() });
      if (!response.url().endsWith('/api/step')) return;
      try {
        const data = await response.json();
        const entry = { event: 'response', type: response.request().postDataJSON()?.type, status: response.status(), error: data.error,
          actionCount: data.observation?.action_count, assessmentCopay: data.observation?.assessment?.fields?.copay, records: data.observation?.records?.length };
        desktopSteps.push(entry); event('api-step', entry);
      } catch (error) { const entry = { event: 'response-error', error: error.message }; desktopSteps.push(entry); event('api-step', entry); }
    });
    stage('initial layout');
    await desktop.goto(base); await ready(desktop); await audit(desktop, `${engineName}-desktop`, false);
    assert.equal(await desktop.locator('.mobile-menu-toggle').isVisible(), false);
    assert.equal(await desktop.locator('.mobile-main-menu').isVisible(), true);
    assert.equal(await desktop.locator('.mobile-progress').isVisible(), false, `${engineName}: mobile section controls leak onto desktop`);
    await shot(desktop, `${engineName}-desktop`);
    stage('playback and opening a case');
    await desktop.locator('#demo-play').click();
    await desktop.waitForFunction(() => document.getElementById('demo-play').getAttribute('aria-label') === 'Pause walkthrough');
    await desktop.locator('#demo-try').click();
    await desktop.waitForSelector('#worklist.active #case-view:not([hidden])');
    assert.equal(await desktop.locator('#demo-play').getAttribute('aria-label'), 'Play walkthrough', `${engineName}: opening a case leaves playback running`);
    const chartTabs = desktop.locator('.chart-tabs [role="tab"]');
    stage('chart keyboard tabs');
    assert.equal(await chartTabs.count(), 4);
    assert.equal(await desktop.locator('.chart-tabs [aria-selected="true"]').count(), 1);
    await desktop.locator('#chart-tab-patient').focus();
    await desktop.keyboard.press('ArrowRight');
    assert.equal(await desktop.evaluate(() => document.activeElement.id), 'chart-tab-coverage');
    assert.equal(await desktop.locator('#chart-tab-patient').getAttribute('aria-selected'), 'true', `${engineName}: manual tabs must wait for activation`);
    await desktop.keyboard.press('Enter');
    await desktop.waitForFunction(() => document.getElementById('chart-tab-coverage').getAttribute('aria-selected') === 'true');
    assert.equal(await desktop.locator('#chart-content').getAttribute('role'), 'tabpanel');
    assert.equal(await desktop.locator('#chart-content').getAttribute('aria-labelledby'), 'chart-tab-coverage');
    assert.equal(await desktop.locator('#chart-tab-coverage').getAttribute('aria-controls'), 'chart-content');
    assert.equal(await desktop.locator('.chart-tabs [tabindex="0"]').count(), 1);
    await desktop.waitForFunction(() => !document.body.classList.contains('busy'));
    await desktop.keyboard.press('Home');
    assert.equal(await desktop.evaluate(() => document.activeElement.id), 'chart-tab-patient');
    await desktop.keyboard.press('Space');
    await desktop.waitForFunction(() => document.getElementById('chart-tab-patient').getAttribute('aria-selected') === 'true' && !document.body.classList.contains('busy'));
    reports.push({ label: `${engineName}-chart-tabs-accessibility`, passed: true });
    stage('inquiry and initial assessment');
    await desktop.locator('#prefill-query').click();
    await desktop.locator('#send-query').click();
    await desktop.waitForFunction(() => !document.getElementById('poll').disabled);
    await desktop.locator('#poll').click();
    await desktop.waitForFunction(() => !document.getElementById('prefill-assessment').disabled);
    await desktop.locator('#prefill-assessment').click();
    await desktop.locator('#prepare').click();
    await desktop.waitForFunction(() => !document.getElementById('save').disabled);
    await desktop.locator('#a-copay').fill('31');
    assert.equal(await desktop.locator('#save').isDisabled(), true, `${engineName}: an unprepared edit can be saved`);
    assert.equal(await desktop.locator('#assessment-state').textContent(), 'Changes not prepared');
    assert.equal(await desktop.locator('#guide-next').textContent(), 'Prepare assessment');
    stage('guided reprepare after editing copay');
    const isAssess = (request) => request.url().endsWith('/api/step') && request.postDataJSON()?.type === 'assess';
    const [, assessResponse] = await Promise.all([
      desktop.waitForRequest(isAssess, { timeout: 5000 }),
      desktop.waitForResponse((response) => isAssess(response.request()), { timeout: 5000 }),
      desktop.locator('#guide-next').click(),
    ]);
    const assessed = await assessResponse.json();
    assert.equal(assessResponse.ok(), true, `${engineName}: guided assessment failed: ${JSON.stringify(assessed)}`);
    assert.equal(assessed.observation?.assessment?.fields?.copay, 31, `${engineName}: guided assessment submitted stale copay`);
    await desktop.waitForFunction(() => !document.getElementById('save').disabled, null, { timeout: 5000 });
    assert.equal(await desktop.locator('#assessment-state').textContent(), 'Assessment prepared');
    stage('confirmation changes invalidate prepared assessment');
    await desktop.locator('details.assurance > summary').click();
    assert.equal(await desktop.locator('#payment-guarantee').isVisible(), true);
    await desktop.locator('#payment-guarantee').check();
    assert.equal(await desktop.locator('#save').isDisabled(), true, `${engineName}: a changed confirmation can be saved`);
    await desktop.locator('#payment-guarantee').uncheck();
    assert.equal(await desktop.locator('#save').isEnabled(), true, `${engineName}: restoring prepared values should permit saving`);
    reports.push({ label: `${engineName}-assessment-draft`, passed: true });
    stage(name === 'no-interception' ? 'real save without interception' : 'controls during a delayed save');
    if (name === 'no-interception') {
      await desktop.locator('#save').click();
      await desktop.waitForFunction(() => !document.getElementById('saved-record').hidden && !document.body.classList.contains('busy'));
    } else {
      let releaseSave;
      const holdSave = new Promise((resolve) => { releaseSave = resolve; });
      const holdSaveRequest = async (route) => {
        event('route-enter', { type: route.request().postDataJSON()?.type });
        if (route.request().postDataJSON()?.type === 'save') await holdSave;
        await route.continue();
        event('route-completed', { type: route.request().postDataJSON()?.type });
      };
      await desktop.route('**/api/step', holdSaveRequest);
      const pendingSave = desktop.waitForRequest((request) => request.url().endsWith('/api/step') && request.postDataJSON()?.type === 'save', { timeout: 5000 });
      await desktop.locator('#save').click();
      await pendingSave;
      try {
        assert.equal(await desktop.locator('#a-copay').isDisabled(), true, `${engineName}: pending Save leaves the draft editable`);
        assert.equal(await desktop.locator('#payment-guarantee').isDisabled(), true, `${engineName}: pending Save leaves the confirmation editable`);
        assert.equal(await desktop.locator('#save').isDisabled(), true, `${engineName}: pending Save remains actionable`);
      } finally { releaseSave(); }
      await desktop.waitForFunction(() => !document.getElementById('saved-record').hidden && !document.body.classList.contains('busy'));
      if (name === 'unrouteAll-wait') await desktop.unrouteAll({ behavior: 'wait' });
      else await desktop.unroute('**/api/step', holdSaveRequest);
    }
    assert.equal(await desktop.locator('#a-copay').inputValue(), '31');
    assert.equal(await desktop.locator('#assessment-state').textContent(), 'Assessment prepared');
    reports.push({ label: `${engineName}-${name === 'no-interception' ? 'real-save' : 'pending-save'}`, passed: true });
    stage('playback during history navigation');
    await desktop.locator('.topbar [data-page="overview"]').click();
    await desktop.locator('#demo-play').click();
    await desktop.waitForFunction(() => document.getElementById('demo-play').getAttribute('aria-label') === 'Pause walkthrough');
    await desktop.goBack();
    await desktop.waitForSelector('#worklist.active');
    assert.equal(await desktop.locator('#demo-play').getAttribute('aria-label'), 'Play walkthrough', `${engineName}: history navigation leaves playback running`);
    reports.push({ label: `${engineName}-playback-navigation`, passed: true });
    stage('desktop specifications');
    await desktop.goto(`${base}/notes`); await ready(desktop);
    assert.equal(await desktop.locator('.mobile-progress').isVisible(), false, `${engineName}: specifications mobile controls leak onto desktop`);
    await auditSpecificationsHero(desktop, `${engineName}-desktop-notes`);
    await shot(desktop, `${engineName}-desktop-notes`);
    assert.deepEqual(desktopErrors, [], `${engineName}: desktop browser exceptions`);
    state.outcome = 'completed';
  } catch (error) {
    state.outcome = 'failed';
    state.error = error.stack;
    event('probe-failure', error.message);
    if (desktop && !desktop.isClosed()) {
      state.failureState = await Promise.race([
        desktop.evaluate(() => ({ path: location.pathname, readyState: document.readyState, scrollY,
          historyRestoration: history.scrollRestoration, activePage: document.querySelector('.page.active')?.id,
          busy: document.body.classList.contains('busy'), notice: document.getElementById('notice')?.textContent,
          assessment: document.getElementById('assessment-state')?.textContent, saveDisabled: document.getElementById('save')?.disabled,
          documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight }))
          .catch((failure) => ({ diagnosticError: failure.message })),
        new Promise((resolve) => setTimeout(() => resolve({ diagnosticError: 'Failure-state capture exceeded 2 seconds' }), 2000)),
      ]);
      await desktop.screenshot({ path: `${out}/${name}-FAIL.png`, fullPage: false, animations: 'disabled', timeout: 2000 }).catch(() => {});
    }
  } finally {
    state.elapsedMs = Date.now() - started;
    await persist();
    if (browser) await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
    await persist();
  }
}

if (worker) {
  if (!variants.includes(variant)) throw Error('Unknown navigation diagnostic variant');
  await probe(variant);
  process.exit(0);
} else {
  const results = [];
  let serverLog = '', summaryWrites = Promise.resolve();
  const summary = () => {
    const snapshot = JSON.stringify({ variants, results, serverLog }, null, 2);
    summaryWrites = summaryWrites.then(() => writeFile(`${out}/summary.json`, snapshot));
    return summaryWrites;
  };
  const server = spawn(process.execPath, ['server/local.mjs'], { env: { ...process.env, PORT: '4175' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const appendLog = (data) => { serverLog = (serverLog + data).slice(-12000); };
  server.stdout.on('data', appendLog);
  server.stderr.on('data', appendLog);
  server.on('error', (error) => appendLog(error.message));
  try {
    let ready = false;
    for (let n = 0; n < 60; n++) {
      try { if ((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(500) })).ok) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw Error('Navigation diagnostic server did not start');
    await Promise.all(variants.map(async (name) => {
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--variant', name], { detached: process.platform !== 'win32', stdio: 'inherit' });
      const stop = () => {
        try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {}
      };
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; stop(); }, 45000);
      const outcome = await new Promise((resolve) => {
        child.once('exit', (code, signal) => resolve({ code, signal }));
        child.once('error', (error) => resolve({ error: error.message }));
      });
      clearTimeout(timer); stop();
      let detail;
      try { detail = JSON.parse(await readFile(`${out}/${name}.json`, 'utf8')); } catch {}
      results.push({ variant: name, timedOut, ...outcome, detail });
      await summary();
      console.log(`NAV_DIAGNOSTIC_RESULT ${name}: ${JSON.stringify({ timedOut, ...outcome, stage: detail?.stage, outcome: detail?.outcome })}`);
    }));
  } catch (error) {
    results.push({ outcome: 'diagnostic-infrastructure-error', error: error.stack });
    console.error(`NAV_DIAGNOSTIC_ERROR ${error.message}`);
  } finally {
    server.kill('SIGTERM');
    await summary();
  }
}
