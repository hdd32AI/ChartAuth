import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const base = 'http://127.0.0.1:4174';
const out = 'artifacts/mobile-ui/diagnostic';
const variants = ['normal', 'no-toc-layout', 'no-header-backdrop', 'no-mobile-script'];
const variant = process.argv[process.argv.indexOf('--variant') + 1];
const worker = process.argv.includes('--variant');
await mkdir(out, { recursive: true });

async function probe(name) {
  const state = { variant: name, started: new Date().toISOString(), phase: 'launch', phases: [], events: [], captures: [], outcome: 'running' };
  const started = Date.now();
  const event = (kind, detail) => { if (state.events.length < 100) state.events.push({ kind, elapsedMs: Date.now() - started, detail }); };
  let writes = Promise.resolve();
  const persist = () => {
    const text = JSON.stringify(state, null, 2);
    writes = writes.then(() => writeFile(`${out}/${name}.json`, text));
    return writes;
  };
  const phase = async (label) => {
    state.phase = label;
    state.phases.push({ label, elapsedMs: Date.now() - started });
    console.log(`SPEC_DIAGNOSTIC ${name}: ${label}`);
    await persist();
  };
  let browser;
  try {
    await phase('launch');
    browser = await webkit.launch({ timeout: 10000 });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(7000);
    page.setDefaultNavigationTimeout(12000);
    page.on('crash', () => { event('crash', 'WebKit page process crashed'); void persist().catch(() => {}); });
    page.on('pageerror', (error) => event('pageerror', error.message));
    page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) event(`console-${message.type()}`, message.text().slice(0, 1000)); });
    page.on('requestfailed', (request) => event('requestfailed', { url: request.url(), error: request.failure()?.errorText }));
    page.on('response', (response) => { if (response.status() >= 400) event('http-error', { url: response.url(), status: response.status() }); });
    if (name === 'no-toc-layout' || name === 'no-header-backdrop') {
      const override = name === 'no-toc-layout'
        ? '.reading-layout{display:block!important}.reading-toc{position:static!important;max-height:none!important;overflow:visible!important}'
        : '.reader-header{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
      await page.route('**/paper.css', async (route) => {
        const response = await route.fetch({ timeout: 7000 });
        await route.fulfill({ response, body: `${await response.text()}\n${override}\n` });
      });
    }
    if (name === 'no-mobile-script') {
      await page.route('**/mobile.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: '/* Diagnostic variant: mobile enhancement script omitted. */' }));
    }
    async function capture(label, screenshot = true) {
      await phase(`${label}:dimensions`);
      const dimensions = await page.evaluate(() => {
        const rect = (selector) => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const r = node.getBoundingClientRect(), css = getComputedStyle(node);
          return { x: r.x, y: r.y, width: r.width, height: r.height, display: css.display, position: css.position, backdropFilter: css.backdropFilter };
        };
        return { path: location.pathname, readyState: document.readyState, mobileReady: document.documentElement.classList.contains('mobile-ready'),
          nodes: document.getElementsByTagName('*').length, viewportWidth: innerWidth, viewportHeight: innerHeight,
          documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
          bodyWidth: document.body.scrollWidth, bodyHeight: document.body.scrollHeight,
          header: rect('.reader-header'), hero: rect('.paper-hero'), layout: rect('.reading-layout'), toc: rect('.reading-toc') };
      });
      state.captures.push({ label, elapsedMs: Date.now() - started, dimensions });
      await persist();
      if (screenshot) {
        await phase(`${label}:screenshot`);
        await page.screenshot({ path: `${out}/${name}-${label}.png`, fullPage: false, animations: 'disabled', timeout: 5000 });
      }
    }
    async function notes(label) {
      await phase(`${label}:navigate`);
      await page.goto(`${base}/notes`, { waitUntil: 'domcontentloaded' });
      await phase(`${label}:ready`);
      await page.waitForSelector('.paper-hero h1');
      if (name !== 'no-mobile-script') await page.waitForSelector('html.mobile-ready');
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))]));
      await page.waitForTimeout(250);
      await capture(label);
      await phase(`${label}:load`);
      await page.waitForLoadState('load', { timeout: 12000 });
    }
    await notes('direct-notes');
    await phase('workspace:navigate');
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.editorial-hero');
    if (name !== 'no-mobile-script') await page.waitForSelector('html.mobile-ready');
    await capture('workspace', false);
    await notes('after-workspace-notes');
    state.outcome = state.events.some((e) => ['crash', 'pageerror'].includes(e.kind)) ? 'page-error' : 'completed';
  } catch (error) {
    state.outcome = 'failed';
    state.error = error.stack;
    event('probe-failure', error.message);
  } finally {
    state.elapsedMs = Date.now() - started;
    await persist();
    if (browser) await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
  }
}

if (worker) {
  if (!variants.includes(variant)) throw Error('Unknown specifications probe variant');
  await probe(variant);
  process.exit(0);
} else {
  const results = [];
  let serverLog = '';
  const server = spawn(process.execPath, ['server/local.mjs'], { env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    if (!ready) throw Error('Specifications diagnostic server did not start');
    for (const name of variants) {
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
      clearTimeout(timer);
      stop();
      let detail;
      try { detail = JSON.parse(await readFile(`${out}/${name}.json`, 'utf8')); } catch {}
      results.push({ variant: name, timedOut, ...outcome, detail });
      await writeFile(`${out}/summary.json`, JSON.stringify({ results, serverLog }, null, 2));
      console.log(`SPEC_DIAGNOSTIC_RESULT ${name}: ${JSON.stringify({ timedOut, ...outcome, phase: detail?.phase, outcome: detail?.outcome })}`);
    }
  } catch (error) {
    results.push({ outcome: 'diagnostic-infrastructure-error', error: error.stack });
    console.error(`SPEC_DIAGNOSTIC_ERROR ${error.message}`);
  } finally {
    server.kill('SIGTERM');
    await writeFile(`${out}/summary.json`, JSON.stringify({ results, serverLog }, null, 2));
  }
}
