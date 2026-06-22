import { useEffect } from 'react';
import Lenis from 'lenis';
import { useExperience } from '../store/useExperience.js';

// Lenis smooth scroll -> normalized scrollProgress in the store: the single scroll
// authority. Every system (camera, character, future DOM reveals) reads from this one
// value; there is no second scroll/timeline library (see docs/adr/ADR-001-drop-gsap.md).
export function useScrollSetup() {
  const setScrollProgress = useExperience((s) => s.setScrollProgress);
  const setScrollVelocity = useExperience((s) => s.setScrollVelocity);

  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.1 });

    lenis.on('scroll', ({ scroll, limit }) => {
      setScrollProgress(limit > 0 ? scroll / limit : 0);
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

    // dev-only: jump to an exact scroll fraction for tuning (e.g. window.__seek(0.57))
    if (import.meta.env.DEV) {
      window.__seek = (frac) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        lenis.scrollTo(frac * max, { immediate: true });
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [setScrollProgress, setScrollVelocity]);
}
