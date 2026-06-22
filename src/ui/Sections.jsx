import { philosophy, areasOfFocus } from '../data/copy.js';
import RevealText from './RevealText.jsx';

// Phase 02 — Philosophy + Phase 03 — Areas of Focus (DOM text beats).
// Kept together for now; split into separate files if they grow.
export function Philosophy() {
  // The philosophy statement is the cinematic intro beat: its lines write themselves in word by
  // word as you scroll through, then the phoenix ember rises behind it. Drives its own reveal,
  // so the inner opts out of the block reveal-and-stay (.inner--reveal).
  return (
    <section className="section" id="philosophy">
      <div className="inner inner--reveal">
        <RevealText as="p" className="lead" stageId="philosophy" text={philosophy.lead} from={0} to={0.4} />
        <RevealText
          as="p"
          className="body"
          stageId="philosophy"
          text={philosophy.body}
          from={0.18}
          to={0.62}
        />
      </div>
    </section>
  );
}

export function AreasOfFocus() {
  return (
    <section className="section" id="focus">
      <div className="inner">
        <p className="kicker">Areas of focus</p>
        <ul className="focus-list">
          {areasOfFocus.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
