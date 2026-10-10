// Climb caption contrast at each stage: text hidden, background behind each line captured, WCAG contrast vs the brightest 2%.
// Pass: h2 at least 3:1, the line (.lead) at least 4.5:1, at 1600x900 and 390x844. Usage: node scripts/tests/climb-contrast.mjs [base]
import { chromium } from 'playwright';
import { STAGES } from '../../src/climb/journey.js';
const base = process.argv[2] || 'http://127.0.0.1:5174';
const MIN = { h2: 3, '.lead': 4.5 };
let failed = 0;
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
for (const [w, h] of [[1600, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const { slug } of STAGES) {
    await page.goto(base + '/#' + slug); await page.waitForTimeout(2500);
    const rows = [];
    for (const sel of [`#${slug} h2`, `#${slug} .lead`]) {
      const el = page.locator(sel).first(); const box = await el.boundingBox();
      if (!box || box.y < 0 || box.y + box.height > h) { failed++; rows.push(sel.split(' ')[1] + ' offscreen FAIL'); continue; }
      const color = await el.evaluate((e) => getComputedStyle(e).color);
      await page.addStyleTag({ content: '.stage .caption > * { visibility: hidden !important }' });
      const buf = await page.screenshot({ clip: box });
      await page.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('visibility: hidden !important')) s.remove(); }));
      const px = await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return Array.from(x.getImageData(0, 0, c.width, c.height).data); }, buf.toString('base64'));
      const L = []; for (let i = 0; i < px.length; i += 4) L.push(lum(px[i], px[i + 1], px[i + 2]));
      L.sort((a, b) => b - a); const bg = L[Math.floor(L.length * 0.02)];
      const [r, g, b] = color.match(/\d+/g).map(Number); const fg = lum(r, g, b);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05), key = sel.split(' ')[1], pass = ratio >= MIN[key];
      if (!pass) failed++;
      rows.push(`${key} ${ratio.toFixed(1)}:1${pass ? '' : ' FAIL'}`);
    }
    console.log(String(w).padEnd(5), slug.padEnd(20), rows.join('   '));
  }
  await page.close();
}
await browser.close();
console.log(failed ? `FAIL (${failed})` : 'PASS'); process.exit(failed ? 1 : 0);
