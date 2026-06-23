import { projects } from '../data/projects.js';

// Phases 04-05 — Project Discovery + Exploration. The work.
// A card with a real href renders as a link (a calling card you can open); a Concept with
// href:null renders as a non-interactive <article> — honest, never a dead `#` anchor (keeps the
// locked "no dead placeholder links" rule). Clickable cards get a hover lift + accent edge-glow
// and a → that slides in; Concept cards stay calm. Renders any number of cards.
export default function ProjectCards() {
  return (
    <section className="section" id="work">
      <div className="inner">
        <p className="kicker">Selected work</p>
        <div className="cards">
          {projects.map((p) => {
            const external = typeof p.href === 'string' && p.href.startsWith('http');
            const body = (
              <>
                <h3>{p.name}</h3>
                <div className="theme">{p.theme.join(' \u00b7 ')}</div>
                <p className="concept">{p.concept}</p>
                <div className="status">{p.status}</div>
              </>
            );
            return p.href ? (
              <a
                className="card card--link"
                key={p.id}
                href={p.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer noopener' : undefined}
              >
                {body}
                <span className="card-go" aria-hidden="true">
                  {'\u2192'}
                </span>
              </a>
            ) : (
              <article className="card card--static" key={p.id}>
                {body}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
