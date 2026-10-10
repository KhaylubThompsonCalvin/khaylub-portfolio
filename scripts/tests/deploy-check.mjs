// The combined deploy's checks, run against a built folder (dist-deploy/, or dist/ in the khaylub-portfolio repo).
// Serves it with serve-static.mjs (404s are real, no index fallback) and runs: the Climb behaviour and scroll suites at
// /, the Summit behaviour suite and switch test at /summit/, a link and asset check across every page (no 404 for any
// internal link, page asset or model), and the download before the first picture for / and /summit/.
// Usage: node scripts/tests/deploy-check.mjs [dir=dist-deploy] [port=5190]     (`npm run check:deploy` builds first)
import { spawn } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { serveStatic } from './serve-static.mjs';

const [dir = 'dist-deploy', port = '5190'] = process.argv.slice(2);
const origin = `http://127.0.0.1:${port}`;
const server = await serveStatic(dir, Number(port));
console.log(`serving ${dir} at ${origin}/`);
const results = [];
const record = (name, pass, detail = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

// ---- the existing suites, as child processes (the server keeps answering while they run)
const run = (file, args) => new Promise((done) => {
  const p = spawn(process.execPath, [file, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', (d) => { out += d; process.stdout.write(d); }); p.stderr.on('data', (d) => process.stderr.write(d));
  p.on('close', (code) => done({ code, out }));
});
console.log('\n== Climb behaviour at /');
record('Climb behaviour suite at /', (await run('scripts/tests/climb-behaviour.mjs', [origin])).code === 0);
console.log('\n== Climb scroll at /');
record('Climb scroll suite at /', (await run('scripts/tests/climb-scroll.mjs', [origin])).code === 0);
console.log('\n== Summit behaviour and switch test at /summit/');
record('Summit regression (behaviour + switch test) at /summit/', (await run('scripts/tests/run-summit-regression.mjs', [origin + '/summit'])).code === 0);

// ---- links and assets: every page, every same-site link and asset in it, and everything the page fetched while running
console.log('\n== Links and assets');
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const PAGES = ['/', '/summit/', '/summit/films/', '/summit/questions/', '/summit/builds/', '/summit/404.html', '/404.html'];
const bad = [], seen = new Set(), errors = [];
for (const path of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) bad.push(`${r.status()} ${r.url().slice(origin.length)} (loaded by ${path})`); });
  // every same-site request is re-fetched below; a download cut off by closing the page (ERR_ABORTED) is not a failure
  page.on('request', (r) => { const url = new URL(r.url()); if (url.protocol === 'http:' && url.origin === origin) seen.add(url.pathname + url.search); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin) && r.failure()?.errorText !== 'net::ERR_ABORTED') bad.push(`failed ${r.url().slice(origin.length)} (${r.failure()?.errorText}, loaded by ${path})`); });
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${path}: ${m.text()}`); });
  const res = await page.goto(origin + path);
  if (res.status() !== 200) bad.push(`${res.status()} ${path} (the page itself)`);
  await page.waitForTimeout(4000);
  if (path === '/') {   // walk the whole journey so every stage and its models load
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= h; y += 400) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(250); }
    await page.waitForTimeout(4000);
  }
  for (const u of await page.evaluate(() => [...document.querySelectorAll('a[href], link[href], img[src], script[src]')].map((e) => e.href || e.src))) {
    const url = new URL(u); if (url.protocol === 'http:' && url.origin === origin) seen.add(url.pathname + url.search);
  }
  await page.close();
}
for (const u of seen) {
  const r = await fetch(origin + u, { redirect: 'manual' });
  if (r.status !== 200) bad.push(`${r.status} ${u} (a link or asset in the pages)`);
}
const missing = await fetch(origin + '/no-such-page/');
const missingBody = await missing.text();
record('a missing address answers 404 with the site 404 page', missing.status === 404 && missingBody.includes('Back to the climb'));
record(`no 404 for any internal link, asset or model (${seen.size} addresses, ${PAGES.length} pages)`, bad.length === 0, bad.join('; '));
record('no console errors on any page', errors.length === 0, errors.join('; '));

// ---- the download before the first picture: everything fetched before the canvas gets its "ready" class
console.log('\n== Download before the first picture');
const sizes = {};
for (const path of ['/', '/summit/']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    new MutationObserver((list, obs) => { const c = document.getElementById('world'); if (c && c.classList.contains('ready')) { window.__firstPicture = performance.now(); obs.disconnect(); } })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.goto(origin + path);
  await page.waitForFunction(() => window.__firstPicture, null, { timeout: 30000 }).catch(() => {});
  const list = await page.evaluate(() => {
    const t = window.__firstPicture ?? Infinity;
    const nav = performance.getEntriesByType('navigation')[0];
    return [{ name: nav.name, size: nav.encodedBodySize }, ...performance.getEntriesByType('resource').filter((r) => r.responseEnd <= t).map((r) => ({ name: r.name, size: r.encodedBodySize }))];
  });
  let raw = 0, gz = 0;
  for (const { name, size } of list) { raw += size; const body = Buffer.from(await (await fetch(name)).arrayBuffer()); gz += /\.(woff2|jpg|png|webp|glb)$/.test(name) ? body.length : gzipSync(body).length; }
  sizes[path] = { files: list.length, kB: Math.round(raw / 1000), gzipKB: Math.round(gz / 1000), firstPictureMs: Math.round(await page.evaluate(() => window.__firstPicture ?? -1)) };
  console.log(path, JSON.stringify(sizes[path]), '\n  ' + list.map((x) => `${x.name.slice(origin.length)} ${Math.round(x.size / 1000)} kB`).join('\n  '));
  await page.close();
}
await browser.close();
server.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\ndeploy check: ${failed ? `FAIL (${failed} of ${results.length})` : `PASS (${results.length} of ${results.length})`}`);
process.exit(failed ? 1 : 0);
