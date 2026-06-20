import { philosophy, areasOfFocus } from '../data/copy.js';

// Phase 02 — Philosophy + Phase 03 — Areas of Focus (DOM text beats).
// Kept together for now; split into separate files if they grow.
export function Philosophy() {
  return (
    <section className="section" id="philosophy">
      <div className="inner">
        <p className="lead">{philosophy.lead}</p>
        <p className="body">{philosophy.body}</p>
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
