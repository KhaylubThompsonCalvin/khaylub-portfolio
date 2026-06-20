import { projects } from '../data/projects.js';

// Phases 04-05 — Project Discovery + Exploration. The work.
// Phase 5 will make these "dynamic calling cards" (tilt, parallax, edge glow,
// Higgsfield video bg). For Phase 0 they're honest static cards.
export default function ProjectCards() {
  return (
    <section className="section" id="work">
      <div className="inner">
        <p className="kicker">Selected work</p>
        <div className="cards">
          {projects.map((p) => (
            <a className="card" key={p.id} href={p.href} target={p.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              <h3>{p.name}</h3>
              <div className="theme">{p.theme.join(' \u00b7 ')}</div>
              <p className="concept">{p.concept}</p>
              <div className="status">{p.status}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
