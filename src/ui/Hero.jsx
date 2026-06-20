import { identity } from '../data/copy.js';

// Phase 01 — Arrival. Identity stated immediately (recruiter clarity).
export default function Hero() {
  return (
    <section className="section" id="arrival">
      <div className="inner">
        <p className="kicker">Khaylub.com</p>
        <h1 className="h1">{identity.name}</h1>
        <p className="role">{identity.role}</p>
        <p className="statement">{identity.statement}</p>
      </div>
    </section>
  );
}
