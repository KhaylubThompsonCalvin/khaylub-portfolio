import { useEffect } from 'react';
import { useExperience } from '../store/useExperience.js';
import { createWind } from '../audio/ambience/wind.js';

// AudioManager — the audio system's single owner. Architecture (per the brief):
//   1. Environmental ambience (on by default) — wind now; birds/footsteps/ember to follow.
//   2. Optional soundtrack — opt-in, mounts here when a score asset lands in src/audio/music.
//   3. Story-beat audio — scroll-triggered swells (phoenix reveal / summit), via the same graph.
// It creates the AudioContext ONLY after the "Tap to explore" gesture (started=true) so nothing
// ever autoplays, fades the master gain on mute (persisted in the store), and maps scrollProgress
// to layer intensities via store.subscribe() — no React re-render, the scrollProgress idiom.
export default function AudioManager() {
  const started = useExperience((s) => s.started);

  useEffect(() => {
    if (!started) return undefined;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined;

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = useExperience.getState().audioOn ? 1 : 0;
    master.connect(ctx.destination);

    const wind = createWind(ctx, master);

    // Scroll-reactive ambience: wind swells in the open landscape (mid-climb) and toward the
    // wide summit, calmer at the enclosed arrival. Cheap curve, eased inside the layer.
    const applyScroll = (p) => {
      const open = 0.4 + 0.6 * Math.max(Math.sin(p * Math.PI), p * 0.9);
      wind.setIntensity(open);
    };
    applyScroll(useExperience.getState().scrollProgress);
    const unsubScroll = useExperience.subscribe((s) => applyScroll(s.scrollProgress));

    // Mute/unmute fades the master gain (no pop); state + persistence live in the store.
    const unsubMute = useExperience.subscribe((s) => {
      master.gain.setTargetAtTime(s.audioOn ? 1 : 0, ctx.currentTime, 0.4);
    });

    return () => {
      unsubScroll();
      unsubMute();
      wind.dispose();
      ctx.close();
    };
  }, [started]);

  return null;
}
