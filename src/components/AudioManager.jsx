import { useEffect } from 'react';
import { useExperience } from '../store/useExperience.js';
import { createWind } from '../audio/ambience/wind.js';
import { createScore } from '../audio/music/score.js';

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
    const startMode = useExperience.getState().audioMode;
    master.gain.value = startMode === 'off' ? 0 : 1;
    master.connect(ctx.destination);

    const wind = createWind(ctx, master); // layer 1 — environmental
    const score = createScore(ctx, master); // layer 2 — optional soundtrack
    score.setEnabled(startMode === 'music');

    // Scroll-reactive ambience: wind swells in the open landscape (mid-climb) and toward the
    // wide summit, calmer at the enclosed arrival. Cheap curve, eased inside the layer.
    const applyScroll = (p) => {
      const open = 0.4 + 0.6 * Math.max(Math.sin(p * Math.PI), p * 0.9);
      wind.setIntensity(open);
    };
    applyScroll(useExperience.getState().scrollProgress);
    const unsubScroll = useExperience.subscribe((s) => applyScroll(s.scrollProgress));

    // Mode drives the master mute (no pop) and whether the score plays.
    const applyMode = (mode) => {
      master.gain.setTargetAtTime(mode === 'off' ? 0 : 1, ctx.currentTime, 0.4);
      score.setEnabled(mode === 'music');
    };
    const unsubMode = useExperience.subscribe((s) => applyMode(s.audioMode));

    return () => {
      unsubScroll();
      unsubMode();
      wind.dispose();
      score.dispose();
      ctx.close();
    };
  }, [started]);

  return null;
}
