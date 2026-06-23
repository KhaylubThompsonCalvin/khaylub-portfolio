import { useEffect, useRef } from 'react';
import { useExperience } from '../store/useExperience.js';

// A reusable Higgsfield atmosphere PLATE — a video loop washed over the live scene, its opacity
// driven by scroll so it fades in/out with its beat (store.subscribe — no React re-render). Per
// the vault's rule, this composites over the 3D, never replacing it or the character. Instances
// drive the cinematic: a soft-light dawn-grass wash over the open early beats, a screen-blended
// ember layer that glows through the phoenix → summit window (its black drops out), summit clouds,
// and a low ground-fog plate that hugs the trail through the dark opening beats.
// prefers-reduced-motion freezes it (paused, hidden) so there's no looping motion.
//
// Props: src; blend (mix-blend-mode); max (peak opacity); fadeIn [a,b] ramp-up range; fadeOut
// [c,d] ramp-down range (omit to hold to the end); scrub [a,b] drive frame from scroll instead of
// autoplay. anchor ('bottom' pins the plate to the lower frame so it reads as GROUND fog, not a
// full-frame wash) + feather ('top' masks the upper frame to transparent so the fog never climbs
// into the sky). Both default off, so existing plates are unchanged.
export default function VideoAtmosphere({
  src,
  blend = 'soft-light',
  max = 0.45,
  fadeIn = [0, 0.06],
  fadeOut,
  scrub,
  anchor,
  feather,
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
      // Scrub mode: drive the video's frame from scroll instead of autoplay-looping, so the plate
      // moves only as you scroll and FREEZES on its last frame when you stop — a still backdrop
      // frame-matched to the Wanderer at the summit hold, not looping motion behind a static beat.
      if (scrub && v.duration) {
        v.currentTime = ramp(p, scrub[0], scrub[1]) * (v.duration - 0.05);
      }
    };
    apply(useExperience.getState().scrollProgress);
    // Only re-apply when scrollProgress actually changes (not on every store write).
    const unsub = useExperience.subscribe((s, prev) => {
      if (s.scrollProgress !== prev.scrollProgress) apply(s.scrollProgress);
    });
    // Scrub plates are paused and frame-driven by scroll; looping plates autoplay.
    if (scrub) {
      v.pause();
    } else {
      v.play?.().catch(() => {
        /* muted loop autoplay; ignore if blocked */
      });
    }
    return unsub;
  }, [reducedMotion, fadeIn, fadeOut, max, scrub]);

  // Ground-fog masking. anchor='bottom' aligns the (cover-scaled) video to the lower frame so the
  // densest fog sits along the trail; feather='top' fades the upper ~62% to transparent with a
  // mask gradient, so the plate reads as a band of low fog and never washes the dark sky or the
  // Wanderer's head/shoulders. Defaults (undefined) leave the plate full-frame, unchanged.
  const style = { mixBlendMode: blend };
  if (anchor === 'bottom') style.objectPosition = 'center bottom';
  if (feather === 'top') {
    // transparent at the top → opaque across the lower third; only the ground band shows.
    const g = 'linear-gradient(to bottom, transparent 0%, transparent 42%, rgba(0,0,0,0.6) 64%, #000 82%)';
    style.maskImage = g;
    style.WebkitMaskImage = g;
  }

  return (
    <video
      ref={ref}
      className="video-atmosphere"
      style={style}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
