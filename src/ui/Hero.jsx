import { identity } from '../data/copy.js';

// The Trailhead (arrival). Identity stated immediately (recruiter clarity); the statement
// plants the athlete→tech stakes and the call - the climb the rest of the scroll pays off.
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
