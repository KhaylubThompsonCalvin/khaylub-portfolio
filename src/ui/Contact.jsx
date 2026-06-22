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
        <div className="contact-links">
          {contact.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
