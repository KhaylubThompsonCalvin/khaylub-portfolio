import { useEffect } from 'react';
import Lenis from 'lenis';
import { useExperience } from '../store/useExperience.js';
import { STORY_FRAC } from '../data/stages.js';

// Lenis smooth scroll -> normalized scrollProgress in the store: the single scroll
// authority. Every system (camera, character, future DOM reveals) reads from this one
// value; there is no second scroll/timeline library (see docs/adr/ADR-001-drop-gsap.md).
export function useScrollSetup() {
  const setScrollProgress = useExperience((s) => s.setScrollProgress);
  const setScrollVelocity = useExperience((s) => s.setScrollVelocity);

  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.1 });

    // Map raw page scroll → STORY progress. The whole choreography (walk → flight → the camera
    // spinning around to the head-on FRONT view) plays across the first STORY_FRAC of the page;
    // past that, scrollProgress is HELD at 1 so the camera keeps its front view and the front-on,
    // still-flying firebird becomes the held sky the closing copy + footer scroll over. The extra
    // scroll "goes more down" without disturbing the tuned story (no keyframes shift).
    lenis.on('scroll', ({ scroll, limit }) => {
      const raw = limit > 0 ? scroll / limit : 0;
      setScrollProgress(Math.min(1, raw / STORY_FRAC));
    });

    let raf;
    const loop = (t) => {
      lenis.raf(t);
      // Velocity drives the phoenix's scroll-flair. Read from the RAF loop (not the scroll
      // event) so it decays to 0 on its own when scrolling stops, rather than freezing.
      setScrollVelocity(lenis.velocity);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // dev-only: jump to an exact scroll position for tuning.
    if (import.meta.env.DEV) {
      const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
      // __seek takes STORY progress (the coordinate the choreography is tuned in): __seek(1) lands
      // at the start of the held sky tail, __seek(0.57) the discovery beat, etc. __seekRaw takes a
      // raw page fraction so you can scrub INTO the held tail (e.g. __seekRaw(0.95)).
      window.__seek = (storyP) => {
        const s = Math.min(1, Math.max(0, storyP));
        lenis.scrollTo(s * STORY_FRAC * maxScroll(), { immediate: true });
      };
      window.__seekRaw = (frac) => lenis.scrollTo(frac * maxScroll(), { immediate: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [setScrollProgress, setScrollVelocity]);
}
