// Scroll the whole climb in wheel steps, then jump to the end: frames drawn, worst frame, freezes, sky colour per stage.
// Usage: node scripts/tests/climb-scroll.mjs [base] [--slow]   (--slow: a 4x CPU slowdown through CDP, a cheaper laptop)
import { chromium } from 'playwright';
const base = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'http://127.0.0.1:5174';
const slow = process.argv.includes('--slow');
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
if (slow) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
await page.addInitScript(() => { window.__gaps = []; let last = performance.now(); const f = (t) => { window.__gaps.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
await page.goto(base + '/'); await page.waitForTimeout(4000);
await page.mouse.move(800, 450);
const stagesSeen = new Set();
for (let i = 0; i < 90; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60); stagesSeen.add(await page.evaluate(() => window.__climb?.stage)); }
await page.keyboard.press('Home'); await page.waitForTimeout(800);
const t0 = Date.now(); await page.keyboard.press('End');
await page.waitForFunction(() => window.__climb?.stage === 5, null, { timeout: 5000 }).catch(() => {});
const jumpMs = Date.now() - t0;
const r = await page.evaluate(() => { const g = window.__gaps.slice(60); return { worst: Math.round(Math.max(...g)), freezes: g.filter((x) => x > 50).length }; });
console.log(JSON.stringify({ cpu: slow ? '4x slowdown' : 'full speed', ...r, stagesSeen: [...stagesSeen].sort(), jumpToEndMs: jumpMs, errors: errs }));
const pass = r.freezes === 0 && stagesSeen.size === 6 && jumpMs < 1000 && errs.length === 0;
console.log(pass ? 'PASS' : 'FAIL'); await browser.close(); process.exit(pass ? 0 : 1);
