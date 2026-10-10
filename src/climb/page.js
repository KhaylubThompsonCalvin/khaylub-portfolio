// The Climb's page behaviour: the rail follows the stage in view, rail clicks become addresses (Back works), the
// header slides away and returns as on the Summit, and one motion switch covers CSS and 3D.
import { STAGES } from './journey.js';

export function initPage({ onStage = () => {} } = {}) {
  const root = document.documentElement;
  const links = [...document.querySelectorAll('.rail a[data-index]')];
  const sections = STAGES.map((s) => document.getElementById(s.slug));
  let active = -1;
  function setActive(i, fromScroll) {
    if (i === active) return;
    active = i;
    links.forEach((a, j) => { if (j === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    if (fromScroll && i >= 0) history.replaceState(history.state, '', '#' + STAGES[i].slug);
    onStage(i);
  }
  // which stage is in view: the section crossing the screen's middle
  const crossing = new Set();
  const io = new IntersectionObserver((entries) => {
    let entered = -1;
    for (const e of entries) {
      const i = sections.indexOf(e.target);
      if (e.isIntersecting) { crossing.add(i); entered = i; } else crossing.delete(i);
    }
    if (entered >= 0) setActive(entered, true);
    else if (crossing.size === 0) {
      setActive(-1, true); // landing or footer: no stage in view
      // above stage 1 the address returns to the plain page, so a reload or shared link gets the identity landing
      if (location.hash && sections[0].getBoundingClientRect().top > 0) history.replaceState(history.state, '', location.pathname + location.search);
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
  // rail clicks push an address, so Back returns to the previous stage
  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const i = Number(a.dataset.index);
    if (i !== active) history.pushState({ stage: i }, '', '#' + STAGES[i].slug);
    sections[i].scrollIntoView({ behavior: root.classList.contains('motion') ? 'smooth' : 'instant' });
    setActive(i, false);
  }));
  const goToHash = () => {
    const i = STAGES.findIndex((s) => '#' + s.slug === location.hash);
    if (i >= 0) { sections[i].scrollIntoView({ behavior: 'instant' }); setActive(i, false); }
    else if (!location.hash) scrollTo({ top: 0, behavior: 'instant' });
  };
  window.addEventListener('popstate', goToHash);
  if (location.hash) requestAnimationFrame(goToHash);
  // turning a phone keeps the stage: re-anchor when the WIDTH changes and that stage is in view (controller ruling 3).
  // Height-only resizes (mobile URL bar collapsing) never re-anchor.
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    // active >= 0 means the observer last saw that stage crossing the screen's middle; the reflow from the new
    // width can push it out of view before this runs, so we trust that record rather than re-measuring
    if (active >= 0) sections[active].scrollIntoView({ behavior: 'instant' });
  });
  // the header: as on the Summit
  const header = document.querySelector('.site-header'); let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    header.classList.toggle('solid', y > 40);
    if (Math.abs(y - lastY) > 6) header.classList.toggle('away', y > lastY && y > 160);
    lastY = y;
  }, { passive: true });
  return {
    activeIndex: () => active,
    sectionTops: () => sections.map((s) => s.getBoundingClientRect().top + scrollY),
  };
}
