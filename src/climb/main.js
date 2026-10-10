import './climb.css';
import { initPage } from './page.js';
import { createClimbWorld } from './world.js';
import { progressFromScroll } from './journey.js';
const root = document.documentElement;
root.classList.add('js');
const canvas = document.getElementById('world');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let world = null;
try { world = createClimbWorld(canvas); } catch (e) { console.warn('3D unavailable', e); canvas.remove(); }
const motionOn = () => !reduced.matches && !(world && world.paused);
const syncMotion = () => { root.classList.toggle('motion', motionOn()); root.classList.toggle('still-motion', !motionOn()); };
if (world && reduced.matches) world.setPaused(true);
syncMotion();
reduced.addEventListener?.('change', () => { if (world) world.setPaused(reduced.matches); syncMotion(); toggleSync?.(); });
const page = initPage();
// the ending runs over the last END_SPAN of a screen's height of scroll before the page's bottom (path.js END_*)
const END_SPAN = 0.5;
const endAt = () => { const left = document.documentElement.scrollHeight - innerHeight - scrollY; return Math.min(1, Math.max(0, 1 - left / (END_SPAN * innerHeight))); };
const update = () => world?.setProgress(progressFromScroll(scrollY, page.sectionTops(), innerHeight), endAt());
addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
const toggle = document.querySelector('.motion-toggle');
let toggleSync = null;
if (toggle) {
  if (!world) toggle.hidden = true;
  else {
    toggleSync = () => {
      const locked = reduced.matches;   // reduced motion: the world stays paused, the toggle cannot override it
      toggle.setAttribute('aria-pressed', String(world.paused));
      toggle.textContent = world.paused ? 'Play motion' : 'Pause motion';
      toggle.toggleAttribute('aria-disabled', locked); toggle.title = locked ? 'Motion is off because your device asks for reduced motion' : '';
      syncMotion();
    };
    toggleSync();
    toggle.addEventListener('click', () => { if (reduced.matches) return; world.setPaused(!world.paused); toggleSync(); });
  }
}
window.__climb = world;   // read by scripts/tests/climb-scroll.mjs
