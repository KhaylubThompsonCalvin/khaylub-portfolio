import { useEffect } from 'react';
import Lenis from 'lenis';
import { useExperience } from '../store/useExperience.js';

// Phase 0: Lenis smooth scroll -> normalized scrollProgress in the store.
// Phase 3 will add GSAP ScrollTrigger on top for the authored camera/reveal timeline,
// still writing into the same scrollProgress (one source of truth).
export function useScrollSetup() {
  const setScrollProgress = useExperience((s) => s.setScrollProgress);

  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: true, lerp: 0.1 });

    lenis.on('scroll', ({ scroll, limit }) => {
      setScrollProgress(limit > 0 ? scroll / limit : 0);
    });

    let raf;
    const loop = (t) => {
      lenis.raf(t);
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
  }, [setScrollProgress]);
}
