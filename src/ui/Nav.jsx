import { identity } from '../data/copy.js';

// Audio toggle removed — synth placeholder audio muted pending real assets.
// Restore the button + useExperience imports once AudioManager is re-enabled.
export default function Nav() {
  return (
    <nav className="nav">
      <div className="mark">{identity.name}</div>
      <div className="links">
        <a href="#work">Work</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  );
}
