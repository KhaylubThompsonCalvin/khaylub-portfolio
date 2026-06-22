import { identity } from '../data/copy.js';
import { useExperience } from '../store/useExperience.js';

export default function Nav() {
  // Discrete state (changes only on click) — safe to subscribe; never per-frame.
  const audioMode = useExperience((s) => s.audioMode);
  const cycleAudio = useExperience((s) => s.cycleAudio);

  const label = audioMode === 'off' ? 'Sound off' : audioMode === 'music' ? 'Sound + music' : 'Ambient';

  return (
    <nav className="nav">
      <div className="mark">{identity.name}</div>
      <div className="links">
        <a href="#work">Work</a>
        <a href="#contact">Contact</a>
        <button
          type="button"
          className="audio-toggle"
          onClick={cycleAudio}
          aria-label={`Audio: ${audioMode}. Tap to cycle ambient, music, off.`}
        >
          {label}
        </button>
      </div>
    </nav>
  );
}
