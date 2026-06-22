import { useEffect, useRef } from 'react';
import { useExperience } from '../store/useExperience.js';

// A reusable Higgsfield atmosphere PLATE — a video loop washed over the live scene, its opacity
// driven by scroll so it fades in/out with its beat (store.subscribe — no React re-render). Per
// the vault's rule, this composites over the 3D, never replacing it or the character. Two
// instances drive the cinematic: a soft-light dawn-grass wash over the open early beats, and a
// screen-blended ember layer that glows through the phoenix → summit window (its black drops out).
// prefers-reduced-motion freezes it (paused, hidden) so there's no looping motion.
//
// Props: src; blend (mix-blend-mode); max (peak opacity); fadeIn [a,b] ramp-up range; fadeOut
// [c,d] ramp-down range (omit to hold to the end).
export default function VideoAtmosphere({
  src,
  blend = 'soft-light',
  max = 0.45,
  fadeIn = [0, 0.06],
  fadeOut,
}) {
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

    const ramp = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a || 1)));
    const apply = (p) => {
      let o = ramp(p, fadeIn[0], fadeIn[1]);
      if (fadeOut) o *= 1 - ramp(p, fadeOut[0], fadeOut[1]);
      v.style.opacity = (o * max).toFixed(3);
    };
    apply(useExperience.getState().scrollProgress);
    const unsub = useExperience.subscribe((s, prev) => {
      if (s.scrollProgress !== prev.scrollProgress) apply(s.scrollProgress);
    });
    v.play?.().catch(() => {
      /* muted loop autoplay; ignore if blocked */
    });
    return unsub;
  }, [reducedMotion, fadeIn, fadeOut, max]);

  return (
    <video
      ref={ref}
      className="video-atmosphere"
      style={{ mixBlendMode: blend }}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
