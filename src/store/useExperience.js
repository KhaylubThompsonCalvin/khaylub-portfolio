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

  // actions
  start: () => set({ started: true }),
  setReady: (ready) => set({ ready }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
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
