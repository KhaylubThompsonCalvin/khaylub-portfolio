import { useEffect, useRef } from 'react';
import { useExperience } from '../store/useExperience.js';

// Grass/wind video atmosphere — a Higgsfield-generated dawn-meadow loop washed subtly over the
// live scene (soft-light blend) to add real grass motion to the open early beats, then faded out
// before the phoenix/summit. The vault's rule: Higgsfield is an atmosphere PLATE, never the
// engine or the character — so this composites behind the DOM content and over the 3D, it doesn't
// replace the tonal sky. Opacity is driven imperatively from scroll (store.subscribe — no React
// re-render). prefers-reduced-motion freezes it (paused, hidden) so there's no looping motion.
export default function VideoAtmosphere() {
  const ref = useRef(null);
  const reducedMotion = useExperience((s) => s.reducedMotion);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;

    if (reducedMotion) {
      v.pause();
      v.style.opacity = '0';
      return undefined;
    }

    // Present through the open-landscape walk (arrival → focus), fading out before the spark
    // (~0.45) so it never fights the phoenix beats or the summit sky.
    const apply = (p) => {
      const fadeIn = Math.min(1, p / 0.06);
      const fadeOut = 1 - Math.min(1, Math.max(0, (p - 0.3) / 0.15));
      v.style.opacity = (Math.max(0, fadeIn * fadeOut) * 0.45).toFixed(3);
    };
    apply(useExperience.getState().scrollProgress);
    const unsub = useExperience.subscribe((s) => apply(s.scrollProgress));
    v.play?.().catch(() => {
      /* autoplay of a muted loop; ignore if blocked */
    });
    return unsub;
  }, [reducedMotion]);

  return (
    <video
      ref={ref}
      className="video-atmosphere"
      src="/assets/video/dawn-grass.mp4"
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
