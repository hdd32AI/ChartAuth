import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:4173';
const out = 'mobile-qa';
await fs.mkdir(out, { recursive: true });
for (let attempt = 0; attempt < 40; attempt++) {
  try { if ((await fetch(origin + '/api/health')).ok) break; } catch {}
  if (attempt === 39) throw new Error('Local environment did not start');
  await new Promise((resolve) => setTimeout(resolve, 250));
}
const report = [];
const sizes = [[320,740],[375,812],[390,844],[430,932],[768,1024],[844,390],[1440,1000]];
for (const [browserName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const [width, height] of sizes) {
      const mobile = width < 1000;
      const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const prefix = `${browserName}-${width}x${height}`;
      async function check(name, full = false) {
        await page.waitForTimeout(220);
        const state = await page.evaluate(() => ({
          width: innerWidth,
          content: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll('main *, header *, .access-shell *')].filter((element) => {
            const box = element.getBoundingClientRect();
            if (!box.width || !box.height || element.closest('[hidden], [data-ca-scroll-region], thead, .access-orbit')) return false;
            const css = getComputedStyle(element);
            if (css.visibility === 'hidden' || css.display === 'none') return false;
            return box.left < -1 || box.right > innerWidth + 1;
          }).slice(0,10).map((el) => `${el.tagName}.${el.className}`),
        }));
        report.push({ viewport: prefix, page: name, ...state });
        assert.ok(state.content <= state.width + 1, `${prefix}/${name}: page overflow ${JSON.stringify(state)}`);
        if (mobile) assert.equal(state.offenders.length, 0, `${prefix}/${name}: clipped content ${JSON.stringify(state.offenders)}`);
        if (width === 390 || width === 1440) await page.screenshot({ path: `${out}/${prefix}-${name}.png`, fullPage: full, animations: 'disabled' });
      }
      async function navigate(name) {
        if (mobile) await page.locator('.ca-menu-toggle').click();
        await page.locator(`.topbar > nav [data-page="${name}"]`).click();
        await page.locator(`#${name === 'impact' ? 'overview' : name}.active`).waitFor();
      }
      try {
        await page.goto(origin, { waitUntil: 'networkidle' });
        if (mobile) {
          await page.locator('.ca-section-progress').waitFor({ state: 'visible' });
          assert.equal(await page.locator('.ca-section-dot').count(), 7);
          const centered = await page.locator('.brand-stack').evaluate((el) => Math.abs(el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2 - innerWidth / 2));
          assert.ok(centered < 1.1, `Wordmark is off center by ${centered}px`);
        } else assert.equal(await page.locator('.ca-menu-toggle').isVisible(), false);
        await check('experience', width === 390);
        if (mobile) {
          await page.locator('.ca-section-dot').nth(3).click();
          await page.waitForTimeout(150);
          assert.equal(await page.locator('.ca-progress-label').textContent(), 'Decisions');
          const position = await page.evaluate(() => ({ header: document.querySelector('.topbar').getBoundingClientRect().top, section: document.querySelector('.decision-section').getBoundingClientRect().top, bottom: document.querySelector('.topbar').getBoundingClientRect().bottom }));
          assert.ok(Math.abs(position.header) < 1 && position.section >= position.bottom, 'Sticky header covers the section');
          await check('section-jump');
          await page.locator('.ca-menu-toggle').click();
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.ca-menu-toggle').getAttribute('aria-expanded'), 'false');
          await page.locator('.ca-section-dot').nth(1).click();
        }
        for (let chapter = 0; chapter < 6; chapter++) {
          await page.locator(`[data-chapter="${chapter}"]`).click();
          await check(`walkthrough-${chapter + 1}`);
        }
        await navigate('worklist');
        await page.locator('.work-table tbody tr').first().waitFor();
        await check('worklist');
        await page.locator('.work-table tbody tr').first().locator('td:last-child button').click();
        await page.locator('#case-view').waitFor({ state: 'visible' });
        await check('patient-case');
        await page.locator('#back-queue').click();
        for (const name of ['research', 'production', 'impact']) { await navigate(name); await check(name); }
        if (mobile) {
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          await page.waitForTimeout(250);
          assert.equal(await page.locator('.ca-section-dot[data-complete="true"]').count(), await page.locator('.ca-section-dot').count());
        }
        await page.goto(origin + '/notes', { waitUntil: 'networkidle' });
        await check('specifications');
        if (mobile) {
          await page.locator('.ca-section-dot').nth(3).click();
          await check('specifications-notes');
        }
        const access = await fs.readFile('web/index.html', 'utf8');
        await page.route('**/__access', (route) => route.fulfill({ contentType: 'text/html', body: access }));
        await page.goto(origin + '/__access', { waitUntil: 'networkidle' });
        await check('access');
        if (mobile) {
          const offset = await page.locator('.access-wordmark').evaluate((el) => Math.abs(el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2 - innerWidth / 2));
          assert.ok(offset < 1.1, `Access wordmark is off center by ${offset}px`);
        }
        assert.deepEqual(errors, [], `${prefix}: browser errors`);
        console.log(`PASS ${prefix}: gate, seven sections, six demo chapters, navigation, worklist, case, research, production, impact, specifications`);
      } catch (error) {
        await page.screenshot({ path: `${out}/${prefix}-FAIL.png`, fullPage: true }).catch(() => {});
        await fs.writeFile(`${out}/report.json`, JSON.stringify({ report, failure: error.stack, errors }, null, 2));
        throw error;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
await fs.writeFile(`${out}/report.json`, JSON.stringify({ report, result: 'PASS', viewportConfigurations: sizes.length * 2 }, null, 2));
