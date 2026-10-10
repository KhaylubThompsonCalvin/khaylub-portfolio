// Software-rendered Edge at 5120 wide: is the page responsive, does a page switch land, does the scene draw at all
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const page = await browser.newPage({ viewport: { width: 5120, height: 1300 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto((process.argv[2] || 'http://127.0.0.1:5173') + '/?fps'); await page.waitForTimeout(15000);
const read = () => page.evaluate(() => document.body.lastElementChild.textContent.split(' · ').slice(0, 3).join(' · '));
console.log('home settled :', await read());
const t0 = Date.now();
await page.evaluate(() => [...document.querySelectorAll('a[href="/builds/"]')].find((a) => a.offsetParent).click());
await page.waitForFunction(() => document.querySelector('h1')?.textContent && location.pathname === '/builds/', null, { timeout: 10000 });
console.log('switch to Builds landed in', Date.now() - t0, 'ms');
await page.waitForTimeout(2500);
console.log('builds settled:', await read());
// responsiveness: how long a scroll takes to be handled
const lag = await page.evaluate(async () => { const t = performance.now(); scrollBy(0, 300); await new Promise((r) => requestAnimationFrame(() => r())); return Math.round(performance.now() - t); });
console.log('scroll handled in', lag, 'ms · errors', JSON.stringify(errs));

await browser.close();
