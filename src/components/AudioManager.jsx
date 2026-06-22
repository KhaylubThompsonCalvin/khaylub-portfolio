import { useEffect } from 'react';
import { useExperience } from '../store/useExperience.js';
import { createWind } from '../audio/ambience/wind.js';
import { createScore } from '../audio/music/score.js';
import { createStoryBeats } from '../audio/effects/storyBeats.js';
import { createEmberCrackle } from '../audio/effects/emberCrackle.js';

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
    const story = createStoryBeats(ctx, master); // layer 3 — story-beat swells
    const crackle = createEmberCrackle(ctx, master); // environmental SFX — fire crackle
    score.setEnabled(startMode === 'music');

    // Scroll-reactive: wind swells in the open landscape and toward the wide summit; story swells
    // rise at the phoenix reveal (~0.5) and build to the summit emotional peak. Eased in-layer.
    const applyScroll = (p) => {
      wind.setIntensity(0.4 + 0.6 * Math.max(Math.sin(p * Math.PI), p * 0.9));
      const reveal = p > 0.46 && p < 0.7 ? 1 - Math.abs(p - 0.56) / 0.12 : 0; // phoenix-reveal swell
      const summit = Math.min(1, Math.max(0, (p - 0.85) / 0.1)); // builds to the summit and holds
      story.setLevel(Math.max(reveal * 0.7, summit));
      crackle.setLevel(Math.min(1, Math.max(0, (p - 0.5) / 0.15))); // fire crackle in the phoenix window
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
      story.dispose();
      crackle.dispose();
      ctx.close();
    };
  }, [started]);

  return null;
}
