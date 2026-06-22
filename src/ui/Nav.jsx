import { identity } from '../data/copy.js';
import { useExperience } from '../store/useExperience.js';

export default function Nav() {
  // Discrete state (changes only on click) — safe to subscribe; never per-frame.
  const audioOn = useExperience((s) => s.audioOn);
  const toggleAudio = useExperience((s) => s.toggleAudio);

  return (
    <nav className="nav">
      <div className="mark">{identity.name}</div>
      <div className="links">
        <a href="#work">Work</a>
        <a href="#contact">Contact</a>
        <button
          type="button"
          className="audio-toggle"
          onClick={toggleAudio}
          aria-pressed={audioOn}
          aria-label={audioOn ? 'Turn sound off' : 'Turn sound on'}
        >
          {audioOn ? 'Sound on' : 'Sound off'}
        </button>
      </div>
    </nav>
  );
}
