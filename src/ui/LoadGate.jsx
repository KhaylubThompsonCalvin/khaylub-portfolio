import { useEffect, useRef } from 'react';
import { useExperience } from '../store/useExperience.js';
import { identity } from '../data/copy.js';

// The entry: a living dawn-grass scene behind "Tap to explore". Supplies the user gesture (needed
// to unlock audio later), covers asset loading, and flips started=true — then the whole scene
// fades away to reveal the experience. The grass video is paused under prefers-reduced-motion.
export default function LoadGate() {
  const started = useExperience((s) => s.started);
  const ready = useExperience((s) => s.ready);
  const start = useExperience((s) => s.start);
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reducedMotion) v.pause();
    else v.play?.().catch(() => {});
  }, [reducedMotion]);

  return (
    <div className={`gate-scene${started ? ' hidden' : ''}`} aria-hidden={started}>
      <video
        ref={videoRef}
        className="gate-video"
        src="/assets/video/dawn-grass.mp4"
        muted
        loop
        playsInline
        autoPlay
        aria-hidden="true"
      />
      <button
        type="button"
        className="gate"
        onClick={start}
        disabled={started}
        aria-label="Enter the experience"
      >
        <span className="title">{identity.name}</span>
        <span className="hint">{ready ? 'Tap to explore' : 'Loading…'}</span>
      </button>
    </div>
  );
}
