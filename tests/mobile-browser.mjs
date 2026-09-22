import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:4173', out = 'artifacts/mobile-ui';
await mkdir(out, { recursive: true });
const server = spawn(process.execPath, ['server/local.mjs'], { env: { ...process.env, PORT: '4173' } });
let serverLog = '';
server.stdout.on('data', (data) => { serverLog += data; });
server.stderr.on('data', (data) => { serverLog += data; });
const reports = [], failures = [];
const sizes = [[320, 640], [375, 812], [393, 852], [430, 932], [760, 1024], [844, 390]];
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
async function jump(page, label) {
  await page.locator('.mobile-progress-step').filter({ has: page.locator('.mobile-progress-label', { hasText: label }) }).first().click();
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(200);
  assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - before) <= 1, 'Section navigation drifted after settling');
}
try {
  let started = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) { started = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(started, `Local server did not start: ${serverLog}`);
  for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    try {
      for (const [width, height] of sizes) {
        const name = `${engineName}-${width}x${height}`;
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        try {
          await page.goto(base); await ready(page);
          await audit(page, `${name}-experience`); await shot(page, `${name}-experience`);
          await jump(page, 'Demo');
          const heading = await page.locator('#walkthrough').boundingBox(), header = await page.locator('.mobile-header').boundingBox();
          assert.ok(heading.y >= header.height + 8, `${name}: anchor is obscured by the sticky header`);
          assert.ok(heading.y <= header.height + 20, `${name}: anchor offset leaves excess blank space`);
          assert.equal(await page.locator('.mobile-progress-step[aria-current="location"] .mobile-progress-label').textContent(), 'Demo');
          await audit(page, `${name}-walkthrough`); await shot(page, `${name}-walkthrough`);
          for (let chapter = 0; chapter < 6; chapter++) {
            const tab = page.locator(`[data-chapter="${chapter}"]`);
            await tab.click();
            await page.waitForFunction((index) => document.querySelector(`[data-chapter="${index}"]`)?.getAttribute('aria-selected') === 'true', chapter);
            await audit(page, `${name}-demo-chapter-${chapter + 1}`);
            await shot(page, `${name}-demo-chapter-${chapter + 1}`);
          }
          for (const section of ['Care', 'Logic', 'Build', 'Value']) {
            await jump(page, section); await audit(page, `${name}-${section}`); await shot(page, `${name}-${section}`);
          }
          await page.locator('.mobile-menu-toggle').click();
          assert.equal(await page.locator('.mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
          await page.locator('.mobile-menu-toggle').click();
          await page.locator('.mobile-main-menu [data-page="worklist"]').click();
          await page.waitForSelector('.work-table tbody tr button'); await page.waitForTimeout(200);
          await audit(page, `${name}-worklist`); await jump(page, 'Visits'); await shot(page, `${name}-visits`);
          assert.ok(await page.locator('.work-table tbody td').first().getAttribute('data-mobile-label'), `${name}: mobile cards lack labels`);
          const hiddenCells = await page.locator('.work-table tbody tr').first().locator('td').evaluateAll((cells) => cells.filter((cell) => getComputedStyle(cell).display === 'none').length);
          assert.equal(hiddenCells, 0, `${name}: patient columns were hidden instead of reflowed`);
          await page.locator('.work-table tbody tr button').first().click();
          await page.waitForSelector('#case-view:not([hidden])'); await page.waitForTimeout(200);
          await audit(page, `${name}-patient`); await shot(page, `${name}-patient`);
          await jump(page, 'Inquiry'); await page.locator('#prefill-query').click();
          await audit(page, `${name}-inquiry`); await shot(page, `${name}-inquiry`);
          await page.locator('#send-query').click(); await page.waitForTimeout(200);
          await audit(page, `${name}-inquiry-sent`);
          for (const route of ['research', 'production', 'overview']) {
            await page.locator('.mobile-menu-toggle').click();
            await page.locator(`.mobile-main-menu [data-page="${route}"]`).click();
            await page.waitForSelector(`#${route}.active`); await ready(page);
            assert.equal(await page.evaluate(() => document.activeElement?.matches('.page.active h1, .page.active h2')), true, `${name}: mobile route does not focus the new page heading`);
            await audit(page, `${name}-${route}`); await shot(page, `${name}-${route}`);
          }
          await page.goto(`${base}/notes`); await ready(page);
          await auditSpecificationsHero(page, `${name}-notes`);
          await audit(page, `${name}-notes`); await shot(page, `${name}-notes`);
          await page.locator('.mobile-menu-toggle').click();
          const workspaceLink = page.locator('.mobile-main-menu a').filter({ hasText: 'Open workspace' });
          assert.equal(await workspaceLink.isVisible(), true, `${name}: specifications menu hides Open workspace`);
          await shot(page, `${name}-notes-menu`);
          await workspaceLink.click(); await ready(page);
          await page.waitForSelector('#worklist.active');
          await audit(page, `${name}-notes-to-workspace`);
          await page.goto(`${base}/notes`); await ready(page);
          await jump(page, 'Scale'); await audit(page, `${name}-specifications-scale`); await shot(page, `${name}-specifications-scale`);
          const accessHTML = await readFile('web/index.html', 'utf8');
          await page.route('**/access-preview', (route) => route.fulfill({ contentType: 'text/html', body: accessHTML }));
          await page.goto(`${base}/access-preview`); await page.waitForSelector('html.mobile-ui-loaded');
          await page.waitForTimeout(150);
          const access = await page.evaluate(() => {
            const b = document.querySelector('.access-brand').getBoundingClientRect();
            return { width: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth, centeredBy: Math.abs((b.left + b.right) / 2 - document.documentElement.clientWidth / 2) };
          });
          reports.push({ label: `${name}-access`, ...access });
          assert.ok(access.documentWidth <= width + 1 && access.centeredBy <= 1.5, `${name}: access layout failed`);
          await shot(page, `${name}-access`);
          await page.locator('#access-password').fill('visibility test only');
          await page.locator('#access-show').click();
          assert.equal(await page.locator('#access-password').getAttribute('type'), 'text');
          await page.locator('#access-show').click();
          assert.equal(await page.locator('#access-password').getAttribute('type'), 'password');
          assert.deepEqual(errors, [], `${name}: browser exceptions`);
        } catch (error) {
          failures.push({ name, error: error.stack }); await shot(page, `${name}-FAIL`).catch(() => {});
          console.error(`MOBILE_QA_FAILURE ${name}: ${error.stack}`);
        } finally { await context.close(); }
      }
      const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const desktopErrors = [], desktopSteps = [];
      let desktopStage = 'initial layout';
      const stage = (name) => { desktopStage = name; console.log(`DESKTOP_STAGE ${engineName}: ${name}`); };
      desktop.on('pageerror', (error) => desktopErrors.push(error.message));
      desktop.on('request', (request) => {
        if (request.url().endsWith('/api/step')) desktopSteps.push({ event: 'request', type: request.postDataJSON()?.type });
      });
      desktop.on('response', async (response) => {
        if (!response.url().endsWith('/api/step')) return;
        try {
          const data = await response.json();
          desktopSteps.push({ event: 'response', type: response.request().postDataJSON()?.type, status: response.status(), error: data.error,
            actionCount: data.observation?.action_count, assessmentCopay: data.observation?.assessment?.fields?.copay, records: data.observation?.records?.length });
        } catch (error) { desktopSteps.push({ event: 'response-error', error: error.message }); }
      });
      try {
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
        stage('controls during a delayed save');
        let releaseSave;
        const holdSave = new Promise((resolve) => { releaseSave = resolve; });
        const holdSaveRequest = async (route) => {
          if (route.request().postDataJSON()?.type === 'save') await holdSave;
          await route.continue();
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
        await desktop.unroute('**/api/step', holdSaveRequest);
        assert.equal(await desktop.locator('#a-copay').inputValue(), '31');
        assert.equal(await desktop.locator('#assessment-state').textContent(), 'Assessment prepared');
        reports.push({ label: `${engineName}-pending-save`, passed: true });
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
      } catch (error) {
        const state = await desktop.evaluate(() => {
          const form = document.getElementById('assessment-form');
          return { url: location.pathname, busy: document.body.classList.contains('busy'), notice: document.getElementById('notice')?.textContent,
            guide: document.getElementById('guide-next')?.textContent, assessment: document.getElementById('assessment-state')?.textContent,
            saveDisabled: document.getElementById('save')?.disabled, assuranceOpen: document.querySelector('details.assurance')?.open,
            fields: form ? [...form.elements].map((field) => ({ id: field.id, value: field.value, disabled: field.disabled,
              checked: field.type === 'checkbox' ? field.checked : undefined, valid: field.validity?.valid, validationMessage: field.validationMessage })) : [] };
        }).catch((failure) => ({ diagnosticError: failure.message }));
        const failure = { name: `${engineName}-desktop`, stage: desktopStage, error: error.stack, state, browserErrors: desktopErrors, steps: desktopSteps };
        failures.push(failure);
        console.error(`DESKTOP_QA_FAILURE ${JSON.stringify(failure)}`);
        await shot(desktop, `${engineName}-desktop-FAIL`).catch(() => {});
      }
      finally { await desktop.close(); }
    } finally { await browser.close(); }
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  try {
    await page.goto(base); await ready(page);
    await page.locator('.mobile-progress-step[aria-controls="walkthrough"]').click(); await page.waitForTimeout(1000);
    const y = await page.evaluate(() => scrollY); await page.waitForTimeout(600);
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - y) <= 1, 'Normal-motion navigation keeps moving');
    await audit(page, 'chromium-smooth-scroll'); await shot(page, 'chromium-smooth-scroll');
    reports.push({ label: 'smooth-scroll-stability', passed: true });
  } catch (error) { failures.push({ name: 'smooth-scroll', error: error.stack }); }
  finally { await browser.close(); }
} finally {
  server.kill('SIGTERM');
  await writeFile(`${out}/report.json`, JSON.stringify({ reports, failures, serverLog }, null, 2));
  await writeFile(`${out}/SUMMARY.md`, `# Mobile UI verification\n\n${reports.length} layout/interaction observations. ${failures.length} failures.\n\nChromium and WebKit: 320, 375, 393, 430, 760, 844 landscape, and 1440 desktop.\n\nBrowser-emulation checks, not testing on physical iPhones.\n\n${failures.map((f) => `## ${f.name}\n\n\`\`\`\n${f.error}\n\`\`\``).join('\n\n')}\n`);
}
assert.equal(failures.length, 0, JSON.stringify(failures));
console.log(`MOBILE_QA_PASS ${reports.length} observations; no failures.`);
