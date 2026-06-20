import { contact, closingPrinciple } from '../data/copy.js';

// Phase 06 — Contact & Closing. Phase 5+ may make this a constellation/network.
// For Phase 0: the closing principle + real links.
export default function Contact() {
  return (
    <section className="section" id="contact">
      <div className="inner">
        <p className="lead">{closingPrinciple}</p>
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
