// Default window: 5120 wide (a very wide screen). Reads the page's own ?fps readout (frames actually drawn) for a few views.
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: [...(process.env.SW ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--window-position=0,0'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 5120), height: Number(process.env.H || 1300) } });
const views = process.argv.slice(2).length ? process.argv.slice(2) : ['/?fps', '/?fps&pcam&pd=16', '/?fps&pcam'];
for (const v of views) {
  await page.goto((process.env.BASE || 'http://127.0.0.1:5173') + v); await page.waitForTimeout(Number(process.env.WAIT || 6000));
  const readings = [];
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(1100); readings.push(await page.evaluate(() => document.body.lastElementChild.textContent.split(' · ').slice(0, 3).join(' · '))); }
  console.log(v.padEnd(22), readings.join('  |  '));
}
await browser.close();
