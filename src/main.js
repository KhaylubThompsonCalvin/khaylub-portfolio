import './style.css';
import { createWorld } from './world/scene.js';

const root = document.documentElement;
root.classList.add('js');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const page = document.body.dataset.page || 'home';
const canvas = document.getElementById('world');

// the site works without WebGL: the canvas just stays the page's dark background
let world = null;
try { world = createWorld(canvas, page); } catch (e) { console.warn('3D unavailable', e); canvas.remove(); }

const toggle = document.querySelector('.motion-toggle');
if (toggle) {
  if (!world) toggle.hidden = true;
  const sync = () => { toggle.setAttribute('aria-pressed', String(world.paused)); toggle.textContent = world.paused ? 'Play motion' : 'Pause motion'; syncMotion(); };
  if (world) { sync(); toggle.addEventListener('click', () => { world.setPaused(!world.paused); sync(); }); }
}

// ---- one motion switch for the page: the system's reduced-motion setting or the Pause motion button stills the CSS
// motion (band reveals, cue, cross-fade) as well as the 3D
function motionOn() { return !reduced.matches && !(world && world.paused); }
function syncMotion() {
  root.classList.toggle('motion', motionOn());
  root.classList.toggle('still-motion', !motionOn());
  if (!motionOn()) document.querySelectorAll('.band').forEach((b) => b.classList.add('in'));
}
syncMotion();

// ---- bands rise into view once, as they scroll in (re-armed after each in-place page change)
const reveal = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' })
  : null;
function armReveals() {
  document.querySelectorAll('.band').forEach((b) => { if (reveal && motionOn()) reveal.observe(b); else b.classList.add('in'); });
}
armReveals();

// ---- the header: slides away while reading down, returns on any scroll up, solid once the page has scrolled
const header = document.querySelector('.site-header');
let lastY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle('solid', y > 40);
    if (Math.abs(y - lastY) > 6) header.classList.toggle('away', y > lastY && y > 160);
  }
  lastY = y;
}, { passive: true });

// ---- Moving between the four pages keeps the one world alive: a link fetches the next page's HTML, swaps the
// content in place and the camera glides to that station. Without JavaScript the same links load the pages normally.
// A full page load rebuilt the world every time (new graphics context, shaders, model decode, texture uploads), which
// was the visible stall on every click.
// Paths are full addresses: the Summit may live under a base ("/" alone, "/summit/" in the combined deploy), so the
// page is looked up after stripping the base (import.meta.env.BASE_URL, set in vite.config.js).
const BASE = import.meta.env.BASE_URL;
const ROUTES = { '/': 'home', '/films/': 'films', '/questions/': 'questions', '/builds/': 'builds' };
const pageOf = (path) => (path.startsWith(BASE) ? ROUTES['/' + path.slice(BASE.length)] : undefined);
const html = new Map();            // path -> the page's HTML text, fetched once

async function fetchPage(path) {
  if (!html.has(path)) {
    const res = await fetch(path, { headers: { Accept: 'text/html' } });
    if (!res.ok) throw new Error(`${res.status} for ${path}`);
    html.set(path, await res.text());
  }
  return new DOMParser().parseFromString(html.get(path), 'text/html');
}

function swapContent(doc, path) {
  document.title = doc.title;
  const desc = document.querySelector('meta[name="description"]'), next = doc.querySelector('meta[name="description"]');
  if (desc && next) desc.content = next.content;
  document.body.dataset.page = pageOf(path);
  const main = document.getElementById('main'), incoming = doc.getElementById('main');
  if (main && incoming) main.replaceWith(document.adoptNode(incoming));
  for (const a of document.querySelectorAll('.site-header a')) {
    if (a.getAttribute('href') === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  const landed = document.getElementById('main');
  if (landed) { landed.tabIndex = -1; landed.focus({ preventScroll: true }); }   // screen readers land on the new content
}

async function navigate(path, { push = true } = {}) {
  if (!pageOf(path)) { window.location.href = path; return; }
  let doc;
  try { doc = await fetchPage(path); } catch (e) { console.warn('navigate', e); window.location.href = path; return; }
  if (push) history.pushState({ path }, '', path);
  // the text cross-fades (only <main> takes part, so the 3D keeps gliding live); without support it simply swaps
  const swap = () => { swapContent(doc, path); armReveals(); header?.classList.remove('away'); };
  if (document.startViewTransition && motionOn()) document.startViewTransition(swap); else swap();
  if (world) world.goTo(pageOf(path));
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target || a.origin !== location.origin || a.hash || !pageOf(a.pathname)) return;
  e.preventDefault();
  navigate(a.pathname);
});
// a page link under the pointer (or focused) is fetched ahead of the click, so the swap is instant
document.addEventListener('pointerover', (e) => { const a = e.target.closest?.('a[href]'); if (a && a.origin === location.origin && pageOf(a.pathname) && !a.hash) fetchPage(a.pathname).catch(() => {}); });
document.addEventListener('focusin', (e) => { const a = e.target.closest?.('a[href]'); if (a && a.origin === location.origin && pageOf(a.pathname) && !a.hash) fetchPage(a.pathname).catch(() => {}); });
window.addEventListener('popstate', () => navigate(pageOf(location.pathname) ? location.pathname : BASE, { push: false }));
window.addEventListener('summit:navigate', (e) => navigate(e.detail));   // the signpost boards in the scene
history.replaceState({ path: location.pathname }, '');

// TEMP-PERF: ?fps shows frames per second and the canvas size, for diagnosing slowness in a browser
if (new URLSearchParams(location.search).has('fps')) {
  const box = Object.assign(document.createElement('div'), { style: 'position:fixed;top:8px;right:8px;z-index:99;background:#000c;color:#0f0;font:16px monospace;padding:6px 10px;border-radius:6px' });
  document.body.append(box);
  let n = 0, t0 = performance.now(), worst = 0, last = t0, d0 = world ? world.draws : 0;
  const gl = canvas.getContext?.('webgl2'); const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).replace(/ANGLE \(|\)$/g, '').slice(0, 60) : 'no WebGL';
  const tick = (t) => { n++; worst = Math.max(worst, t - last); last = t;
    if (t - t0 > 1000) {
      const drawn = world ? Math.round((world.draws - d0) * 1000 / (t - t0)) : 0; d0 = world ? world.draws : 0;
      box.textContent = `${drawn} fps drawn (screen ${Math.round(n * 1000 / (t - t0))} Hz) · worst ${Math.round(worst)} ms · ${canvas.width}x${canvas.height} (quality ${world ? Math.round(world.quality * 100) : 0}%) · ${gpu}`; n = 0; t0 = t; worst = 0;
    }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
