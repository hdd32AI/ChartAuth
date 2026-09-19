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
    const width = window.innerWidth, header = document.querySelector('.mobile-header');
    const brand = header.querySelector('.brand, .reader-brand'), button = header.querySelector('.mobile-menu-toggle');
    const b = brand.getBoundingClientRect(), h = header.getBoundingClientRect(), t = button.getBoundingClientRect();
    const rect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    const offenders = [...document.querySelectorAll('main *')].filter((node) => {
      if (node.closest('.mobile-table-scroll, thead, [hidden]')) return false;
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > width + 1);
    }).slice(0, 12).map((node) => ({ tag: node.tagName, id: node.id, class: String(node.className), rect: rect(node.getBoundingClientRect()) }));
    return { width, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      centeredBy: Math.abs((b.left + b.right) / 2 - width / 2), header: rect(h), brand: rect(b), toggle: rect(t),
      sticky: getComputedStyle(header).position, progressCount: header.querySelectorAll('.mobile-progress-step').length,
      rootOverflow: getComputedStyle(document.documentElement).overflowX, menuHidden: header.querySelector('.mobile-main-menu').hidden, offenders };
  });
  reports.push({ label, ...result }); console.log(JSON.stringify({ label, ...result }));
  assert.ok(result.documentWidth <= result.width + 1, `${label}: document overflows ${JSON.stringify(result)}`);
  assert.ok(result.bodyWidth <= result.width + 1, `${label}: body overflows`);
  if (mobile) {
    assert.ok(result.centeredBy <= 1.5, `${label}: brand center is ${result.centeredBy}px off`);
    assert.equal(result.sticky, 'sticky', `${label}: header is not sticky`);
    assert.ok(result.brand.right <= result.toggle.left + 1, `${label}: menu overlaps brand`);
    assert.ok(result.progressCount >= 3 && result.progressCount <= 6, `${label}: missing section navigation`);
    assert.ok(!['hidden', 'clip'].includes(result.rootOverflow), `${label}: root overflow is masked rather than fixed`);
  }
}
async function shot(page, name) { await page.screenshot({ path: `${out}/${name}.png`, fullPage: false, animations: 'disabled' }); }
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
          await page.locator('.mobile-menu-toggle').click();
          assert.equal(await page.locator('.mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
          await page.locator('.mobile-menu-toggle').click();
          await page.locator('.mobile-main-menu [data-page="worklist"]').click();
          await page.waitForSelector('.work-table tbody tr button'); await page.waitForTimeout(200);
          await audit(page, `${name}-worklist`); await jump(page, 'Visits'); await shot(page, `${name}-visits`);
          assert.ok(await page.locator('.work-table tbody td').first().getAttribute('data-mobile-label'), `${name}: mobile cards lack labels`);
          await page.locator('.work-table tbody tr button').first().click();
          await page.waitForSelector('#case-view:not([hidden])'); await page.waitForTimeout(200);
          await audit(page, `${name}-patient`); await shot(page, `${name}-patient`);
          await jump(page, 'Inquiry'); await page.locator('#prefill-query').click();
          await audit(page, `${name}-inquiry`); await shot(page, `${name}-inquiry`);
          await page.locator('#send-query').click(); await page.waitForTimeout(200);
          await audit(page, `${name}-inquiry-sent`);
          for (const route of ['research', 'production', 'notes']) {
            await page.goto(`${base}/${route}`); await ready(page);
            await audit(page, `${name}-${route}`); await shot(page, `${name}-${route}`);
          }
          await jump(page, 'Scale'); await audit(page, `${name}-specifications-scale`); await shot(page, `${name}-specifications-scale`);
          const accessHTML = await readFile('web/index.html', 'utf8');
          await page.route('**/access-preview', (route) => route.fulfill({ contentType: 'text/html', body: accessHTML }));
          await page.goto(`${base}/access-preview`); await page.waitForSelector('html.mobile-ui-loaded');
          await page.waitForTimeout(150);
          const access = await page.evaluate(() => {
            const b = document.querySelector('.access-brand').getBoundingClientRect();
            return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, centeredBy: Math.abs((b.left + b.right) / 2 - innerWidth / 2) };
          });
          reports.push({ label: `${name}-access`, ...access });
          assert.ok(access.documentWidth <= access.width + 1 && access.centeredBy <= 1.5, `${name}: access layout failed`);
          await shot(page, `${name}-access`);
          assert.deepEqual(errors, [], `${name}: browser exceptions`);
        } catch (error) {
          failures.push({ name, error: error.stack }); await shot(page, `${name}-FAIL`).catch(() => {});
          console.error(`MOBILE_QA_FAILURE ${name}: ${error.stack}`);
        } finally { await context.close(); }
      }
      const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      try {
        await desktop.goto(base); await ready(desktop); await audit(desktop, `${engineName}-desktop`, false);
        assert.equal(await desktop.locator('.mobile-menu-toggle').isVisible(), false);
        assert.equal(await desktop.locator('.mobile-main-menu').isVisible(), true);
        await shot(desktop, `${engineName}-desktop`);
      } catch (error) { failures.push({ name: `${engineName}-desktop`, error: error.stack }); }
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
