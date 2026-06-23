import { contact, closingPrinciple } from '../data/copy.js';
import RevealText from './RevealText.jsx';

// Phase 06 — Contact & Closing, the summit/phoenix-fire beat. The closing principle reveals
// word by word as the firebird blazes — a weightier (intensity) reveal that lands warm→ink,
// tying the copy to the fire. Drives its own reveal, so the inner opts out of the block
// reveal-and-stay; the links stay solid and reachable.
export default function Contact() {
  return (
    <section className="section" id="contact">
      <div className="inner inner--reveal">
        <RevealText
          as="p"
          className="lead"
          stageId="contact"
          text={closingPrinciple}
          from={0}
          to={0.5}
          intensity={1.6}
          warm
        />
        <p className="body">{contact.intro}</p>
        {/* Availability — one honest line for recruiters; answers the first question without a
            form. Sits between the intro and the links so it reads as context, not a header. */}
        <p className="availability">{contact.availability}</p>
        {/* The links carry the fire: they brighten with --fire (summit) and flare an ember on hover
            (see index.css), tying the spark→fire motif to the call-to-action. Links without a real
            destination yet render as honest "soon" states, never dead anchors (engineering rule). */}
        <div className="contact-links">
          {contact.links.map((l) => {
            const real = l.href && l.href !== '#';
            return real ? (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
              >
                {l.label}
              </a>
            ) : (
              <span key={l.label} className="link-soon" aria-disabled="true">
                {l.label}
                <em>soon</em>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
