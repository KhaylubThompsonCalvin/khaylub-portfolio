// The Climb's behaviour checks. Usage: node scripts/tests/climb-behaviour.mjs [base]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const out = []; let failed = 0;
const ok = (name, cond, extra = '') => { if (!cond) failed++; out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`); };
const errs = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(base + '/'); await page.waitForTimeout(1500);
ok('identity first: name and two actions', (await page.textContent('h1')).includes('Khaylub Thompson-Calvin') && await page.locator('#begin').count() === 1 && await page.locator('a.skip-work').count() === 1);
ok('six stage sections, each an h2, in order', JSON.stringify(await page.$$eval('section.stage h2', (h) => h.map((x) => x.textContent))) === JSON.stringify(['The Ordinary World', 'The Call', 'The Threshold', 'The Trials', 'The Ordeal', 'The Harvest']));
ok('skip to the summit always in the header', await page.locator('.site-header a.skip-summit').count() === 1);
await page.locator('.rail a[data-index="2"]').click(); await page.waitForTimeout(1200);
await page.locator('.rail a[data-index="4"]').click(); await page.waitForTimeout(1200);
ok('rail click sets the address', page.url().endsWith('#the-ordeal'), page.url());
await page.goBack(); await page.waitForTimeout(1200);
ok('Back returns to the previous stage', page.url().endsWith('#the-threshold') && await page.evaluate(() => document.querySelector('.rail a[aria-current="step"]')?.dataset.index) === '2');
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
ok('back on the landing: no stage marked', await page.locator('.rail a[aria-current="step"]').count() === 0);
await page.locator('.rail a[data-index="1"]').click(); await page.waitForTimeout(1200);
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1200);
ok('back above stage 1: address has no stage hash', await page.evaluate(() => location.hash === ''), page.url());
const jp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
jp.on('pageerror', (e) => errs.push(e.message));
await jp.goto(base + '/'); await jp.waitForTimeout(1500);
await jp.locator('.rail a[data-index="4"]').click(); await jp.waitForTimeout(3000);
const jr = await jp.evaluate(() => ({ log: window.__climb.buildLog, ready: window.__climb.ready, stage: window.__climb.stage }));
ok('a rail jump to stage 5 builds stage 5 and its neighbours, not stage 3 on the way', !jr.log.includes(2) && [3, 4, 5].every((j) => jr.log.includes(j)), JSON.stringify(jr.log));
ok('the stage in view is built and warmed (ready)', jr.ready === true && jr.stage === 4, JSON.stringify(jr));
// mid-flight: whenever the stage in view is not ready, the cloud veil is up (never an empty sky); the light count is fixed
await jp.goto(base + '/#the-ordinary-world'); await jp.waitForTimeout(2500);
const lights0 = await jp.evaluate(() => window.__climb.lightCount);
const fl = await jp.evaluate(() => new Promise((done) => {
  const c = window.__climb, rows = []; const t0 = performance.now();
  const tick = () => { rows.push({ ready: c.ready, clouds: c.cloudsVisible, veil: +c.veil.toFixed(2), lift: +c.lift.toFixed(2), stage: c.stage, inside: c.camY < c.cloudTop }); if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else done(rows); };
  document.querySelector('.rail a[data-index="4"]').click(); requestAnimationFrame(tick);
}));
const notReady = fl.filter((r) => !r.ready), bare = notReady.filter((r) => !r.clouds);
const passedUnbuilt = fl.some((r) => !r.ready && r.lift < 0.05 && r.stage > 0 && r.stage < 4);
ok('rail jump 1 to 5: clouds visible in every frame where the stage in view is not ready', notReady.length > 0 && bare.length === 0, `${fl.length} frames, ${notReady.length} not ready, ${bare.length} bare, passed an unbuilt anchor: ${passedUnbuilt}`);
ok('rail jump 1 to 5: on an unbuilt anchor the camera is inside the cloud sea', fl.filter((r) => !r.ready && r.lift < 0.05 && r.veil > 0.9).every((r) => r.inside), JSON.stringify(fl.filter((r) => !r.ready && r.lift < 0.05).slice(0, 3)));
await jp.waitForTimeout(2500);
const after = await jp.evaluate(() => ({ lights: window.__climb.lightCount, veil: window.__climb.veil, ready: window.__climb.ready }));
ok('the scene light count never changes; the veil clears once the stage is ready', after.lights === lights0 && after.ready && after.veil === 0, JSON.stringify({ lights0, ...after }));
await jp.close();
// the Wanderer: at each stage's middle he is on screen and above the caption (wide screen and phone); he walks while the scroll moves and rests when it stops
for (const [w, h] of [[1600, 900], [390, 844]]) {
  const wp = await browser.newPage({ viewport: { width: w, height: h } });
  wp.on('pageerror', (e) => errs.push(e.message));
  await wp.goto(base + '/'); await wp.waitForTimeout(1500);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    await wp.locator(`.rail a[data-index="${i}"]`).click(); await wp.waitForTimeout(3200);
    rows.push(await wp.evaluate((i) => { const c = window.__climb.wanderer, cap = document.querySelectorAll('section.stage .caption')[i].getBoundingClientRect(); return { stage: window.__climb.stage, ...c, capTop: cap.top }; }, i));
  }
  const inView = rows.every((r) => r.loaded && r.visible && r.stage === rows.indexOf(r) && r.feet.x > 0 && r.feet.x < w && r.head.x > 0 && r.head.x < w && r.head.y > 0 && r.feet.y < h);
  ok(`Wanderer in view at every stage middle at ${w}x${h}`, inView, JSON.stringify(rows.map((r) => [r.visible, r.feet && Math.round(r.feet.x), r.feet && Math.round(r.feet.y), r.head && Math.round(r.head.y)])));
  ok(`Wanderer above the caption at every stage middle at ${w}x${h}`, rows.every((r) => r.feet.y < r.capTop), JSON.stringify(rows.map((r) => [Math.round(r.feet.y), Math.round(r.capTop)])));
  ok(`Wanderer stands 1.8 m tall and walks away from the camera (forward vector dot > 0.5) at ${w}x${h}`, rows.every((r) => r.height === 1.8 && r.away > 0.5));
  // every stage gives pathAt(z), the centre line of its trail; his feet must be on it (within 0.3 m) at each stage's middle
  ok(`Wanderer walks on the trail's centre line (feet within 0.3 m of pathAt) at every stage middle at ${w}x${h}`, rows.every((r) => typeof r.pathX === 'number' && Math.abs(r.x - r.pathX) < 0.3), JSON.stringify(rows.map((r) => [r.pathX === null ? null : +(r.x - r.pathX).toFixed(3)])));
  if (w === 1600) {
    await wp.locator('.rail a[data-index="1"]').click(); await wp.waitForFunction(() => window.__climb.wanderer.walking === 0 && Math.abs(window.__climb.progress - (1.5 / 6)) < 0.03, null, { timeout: 15000 }).catch(() => {}); await wp.waitForTimeout(500);
    ok('Wanderer at rest when the scroll rests', (await wp.evaluate(() => window.__climb.wanderer.walking)) === 0);
    const peak = await wp.evaluate(() => new Promise((done) => { let m = 0; const t0 = performance.now(); const tick = () => { m = Math.max(m, window.__climb.wanderer.walking); if (performance.now() - t0 < 1800) requestAnimationFrame(tick); else done(m); }; scrollBy({ top: 500, behavior: 'smooth' }); requestAnimationFrame(tick); }));
    ok('Wanderer walks while the page scrolls', peak > 0.5, String(peak));
    await wp.waitForTimeout(3000);
    ok('Wanderer settles to rest after the scroll stops', (await wp.evaluate(() => window.__climb.wanderer.walking)) === 0);
  }
  await wp.close();
}
const wr = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1600, height: 900 } });
const wrp = await wr.newPage(); await wrp.goto(base + '/'); await wrp.waitForTimeout(1500);
await wrp.locator('.rail a[data-index="2"]').click(); await wrp.waitForTimeout(3000);
const ws = await wrp.evaluate(() => window.__climb.wanderer);
ok('reduced motion: the Wanderer stands in the scene, not walking', ws.visible === true && ws.walking === 0, JSON.stringify(ws));
await wr.close();
const deep = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await deep.goto(base + '/#the-trials'); await deep.waitForTimeout(1500);
ok('landing mid-journey shows that stage', await deep.evaluate(() => document.querySelector('.rail a[aria-current="step"]')?.dataset.index) === '3');
await deep.setViewportSize({ width: 390, height: 844 }); await deep.waitForTimeout(600); await deep.setViewportSize({ width: 844, height: 390 }); await deep.waitForTimeout(800);
ok('turning a phone keeps the stage', await deep.evaluate(() => document.querySelector('.rail a[aria-current="step"]')?.dataset.index) === '3');
const small = await deep.$$eval('a, button', (els) => els.filter((e) => e.offsetParent && !e.classList.contains('skip')).map((e) => [e.textContent.trim().slice(0, 20), Math.round(e.getBoundingClientRect().height)]).filter((r) => r[1] < 44));
ok('every target at least 44 px', small.length === 0, JSON.stringify(small));
await deep.close();
const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
await ph.goto(base + '/'); await ph.waitForTimeout(1200);
const psmall = await ph.$$eval('a, button', (els) => els.filter((e) => e.offsetParent && !e.classList.contains('skip')).map((e) => [e.textContent.trim().slice(0, 20), Math.round(e.getBoundingClientRect().height)]).filter((r) => r[1] < 44));
ok('phone 390: every target at least 44 px', psmall.length === 0, JSON.stringify(psmall));
const names = await ph.$$eval('.rail a', (as) => as.map((a) => [a.textContent.trim(), getComputedStyle(a.querySelector('span')).display]));
ok('phone 390: every rail mark has an accessible name', names.length === 6 && names.every((n) => n[0] && n[1] !== 'none'), JSON.stringify(names));
await ph.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await ph.waitForTimeout(800);
const boxes = await ph.evaluate(() => { const b = (e) => e.getBoundingClientRect(); const t = b(document.querySelector('.motion-toggle')), r = b(document.querySelector('.rail')); return { tb: t.bottom, rt: r.top }; });
ok('phone 390: Pause motion clear of the rail strip', boxes.tb <= boxes.rt, JSON.stringify(boxes));
const stillTop = await ph.evaluate(async () => { const y = scrollY; dispatchEvent(new Event('resize')); await new Promise((r) => setTimeout(r, 200)); return Math.abs(scrollY - y) < 2; });
ok('phone 390: a height-only resize does not move the page', stillTop);
await ph.close();
const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
const nj = await ctx.newPage(); await nj.goto(base + '/');
ok('no JavaScript: every stage readable in order', (await nj.$$eval('section.stage h2', (h) => h.length)) === 6 && await nj.locator('.site-header a.skip-summit').count() === 1);
ok('no JavaScript: the motion toggle is hidden', !(await nj.locator('.motion-toggle').isVisible()));
await ctx.close();
const rm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const rp = await rm.newPage(); await rp.goto(base + '/'); await rp.waitForTimeout(1200);
ok('reduced motion: still-motion on', await rp.evaluate(() => document.documentElement.classList.contains('still-motion')));
const tg = rp.locator('.motion-toggle');
if (await tg.isVisible()) await tg.click({ force: true });
await rp.mouse.move(700, 450); for (let i = 0; i < 10; i++) { await rp.mouse.wheel(0, 300); await rp.waitForTimeout(50); }
ok('reduced motion: toggle cannot unpause the world', await rp.evaluate(() => window.__climb.paused === true));
for (let i = 0; i < 3; i++) { await rp.waitForTimeout(2000); await rp.mouse.wheel(0, 400); }
await rp.waitForTimeout(2000);
ok('reduced motion: idle gaps never lower the render scale', await rp.evaluate(() => window.__climb.quality === 1), String(await rp.evaluate(() => window.__climb.quality)));
await rm.close();
ok('no console errors', errs.length === 0, JSON.stringify(errs));
console.log(out.join('\n')); await browser.close(); process.exit(failed ? 1 : 0);
