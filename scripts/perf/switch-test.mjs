// In-place page switching in a visible Edge window: frame gaps from the moment of each click, plus the page state.
import { chromium } from 'playwright';
// base may carry a path when the Summit lives under one, e.g. http://127.0.0.1:5190/summit (the combined deploy)
const base = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:5173').replace(/\/$/, '');
const prefix = new URL(base).pathname.replace(/\/$/, '');   // '' or '/summit'
const slow = process.argv.includes('--slow');
const shots = process.argv.includes('--shots');
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--window-position=0,0'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
const errs = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
if (slow) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
await page.addInitScript(() => {
  window.__gaps = []; let last = performance.now();
  const f = (t) => { window.__gaps.push([t, t - last]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
});
await page.goto(base + '/'); await page.waitForTimeout(3500);
const rows = [];
let loads = 0; page.on('load', () => loads++);
for (const [href, h1] of [['/films/', 'Short films'], ['/questions/', 'Questions Worth Keeping'], ['/builds/', null], ['/', 'Khaylub Thompson-Calvin'], ['/films/', 'Short films']].map(([h, t]) => [prefix + h, t])) {
  await page.hover(`.site-header a[href="${href}"]`); await page.waitForTimeout(250);   // a real hand hovers first (prefetch)
  const t0 = await page.evaluate((h) => { const t = performance.now(); [...document.querySelectorAll(`a[href="${h}"]`)].find((a) => a.offsetParent).click(); return t; }, href);
  if (shots && href === prefix + '/questions/') { for (const d of [150, 1600, 3600]) { await page.waitForTimeout(d === 150 ? 150 : d === 1600 ? 1450 : 2000); await page.screenshot({ path: `glide-${d}.png` }); } }
  await page.waitForTimeout(4200);
  rows.push(await page.evaluate(({ t0, href, h1 }) => {
    const g = window.__gaps.filter((x) => x[0] > t0 && x[0] < t0 + 4000);
    const st = g.filter((x) => x[1] > 50).map((x) => Math.round(x[1]));
    const glide = g.filter((x) => x[0] < t0 + 3300);
    return { page: href, url: location.pathname === href ? 'ok' : location.pathname, title: document.title.slice(0, 22), h1: h1 === null || document.querySelector('h1')?.textContent === h1 ? 'ok' : document.querySelector('h1')?.textContent, current: document.querySelector('.site-header a[aria-current="page"]')?.getAttribute('href'), glideFps: Math.round(glide.length / 3.3), glideWorst: Math.round(Math.max(...glide.map((x) => x[1]))), stalls: st.length, stallMs: st.reduce((a, b) => a + b, 0) };
  }, { t0, href, h1 }));
}
await page.goBack(); await page.waitForTimeout(600);
const back = await page.evaluate(() => `${location.pathname} · ${document.querySelector('h1')?.textContent} · nav=${document.querySelector('.site-header a[aria-current="page"]')?.getAttribute('href')}`);
console.log((slow ? 'EDGE 4x CPU slowdown' : 'EDGE full speed'));
console.table(rows);
console.log('after Back:', back, '| full page loads during the run:', loads, '| console errors:', JSON.stringify(errs));
await browser.close();
