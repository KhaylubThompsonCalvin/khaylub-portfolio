import { useExperience } from '../store/useExperience.js';
import { identity } from '../data/copy.js';

// The "Tap to explore" gate. Supplies the user gesture (needed for audio later),
// covers asset loading, and flips started=true.
export default function LoadGate() {
  const started = useExperience((s) => s.started);
  const ready = useExperience((s) => s.ready);
  const start = useExperience((s) => s.start);

  return (
    <button
      type="button"
      className={`gate${started ? ' hidden' : ''}`}
      onClick={start}
      disabled={started}
      aria-label="Enter the experience"
    >
      <span className="title">{identity.name}</span>
      <span className="hint">{ready ? 'Tap to explore' : 'Loading\u2026'}</span>
    </button>
  );
}
