import { create } from 'zustand';
import { STAGES, stageAt } from '../data/stages.js';

// THE single source of truth. Scroll writes scrollProgress; everything else reads it.
// Keep this lean — derived values are computed by consumers from scrollProgress.
export const useExperience = create((set, get) => ({
  // lifecycle
  started: false, // set true after the "Tap to explore" gate
  ready: false, // set true once the GLB + assets have loaded
  reducedMotion: false, // mirror prefers-reduced-motion

  // the spine
  scrollProgress: 0, // 0 -> 1 across the whole experience
  stageId: STAGES[0].id, // current phase id, derived on write
  reachedStageIndex: 0, // furthest stage index ever reached; monotonic, drives reveal-and-stay

  // input — pointer parallax + scroll-velocity flair (the phoenix interaction). Written by
  // listeners; read via getState() in frame loops, never subscribed (same idiom as scrollProgress).
  pointerX: 0, // -1 (left) .. 1 (right), viewport-normalized
  pointerY: 0, // -1 (bottom) .. 1 (top)
  scrollVelocity: 0, // signed Lenis velocity; decays to 0 when idle

  // audio — three modes the nav cycles through: 'ambient' (environmental), 'music' (ambient + the
  // opt-in score), 'off'. Defaults to OFF until a real (licensed/recorded) track replaces the
  // synthesized placeholder — a stored choice still wins, so anyone who turned it on keeps it.
  audioMode: (() => {
    try {
      const v = localStorage.getItem('kt-audio');
      return v === 'music' || v === 'off' || v === 'ambient' ? v : 'off';
    } catch {
      return 'off';
    }
  })(),

  // actions
  start: () => set({ started: true }),
  setReady: (ready) => set({ ready }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setPointer: (x, y) => set({ pointerX: x, pointerY: y }),
  setScrollVelocity: (v) => {
    if (v !== get().scrollVelocity) set({ scrollVelocity: v });
  },
  cycleAudio: () =>
    set((s) => {
      const order = ['ambient', 'music', 'off'];
      const next = order[(order.indexOf(s.audioMode) + 1) % order.length];
      try {
        localStorage.setItem('kt-audio', next);
      } catch {
        /* ignore */
      }
      return { audioMode: next };
    }),
  setScrollProgress: (p) => {
    const clamped = Math.min(1, Math.max(0, p));
    const stage = stageAt(clamped);
    const reached = Math.max(get().reachedStageIndex, STAGES.indexOf(stage));
    if (
      clamped !== get().scrollProgress ||
      stage.id !== get().stageId ||
      reached !== get().reachedStageIndex
    ) {
      set({ scrollProgress: clamped, stageId: stage.id, reachedStageIndex: reached });
    }
  },
}));
