import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Map an honest status string onto one of three badge states.
function statusState(status = '') {
  const s = status.toLowerCase();
  if (s.startsWith('live')) return 'live';
  if (s.includes('progress')) return 'progress';
  return 'concept';
}

// Click-to-expand case-study panel. Portaled to <body> so it escapes the transformed/stacked
// overlay and the fixed WebGL canvas. It "pulls out" of the clicked card: a dependency-free FLIP —
// we render the panel centered, then start it translated+scaled back onto the card's rect and let
// it grow into place (and collapse back on close). This gives the framer-motion shared-layout feel
// without a new dependency (consistent with ADR-001: store/CSS-driven motion, no animation lib).
// Esc + backdrop + close all dismiss; focus is trapped and restored; body scroll is locked; the
// film plays large (frozen poster under prefers-reduced-motion); the whole pull-out is skipped when
// reduced motion is requested.
export default function ProjectDetail({ project, originRect, reducedMotion, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const lastFocused = useRef(null);
  // phase: 'enter' (offset onto the card) → 'in' (grown to centre) → 'exit' (back to the card)
  const [phase, setPhase] = useState(reducedMotion ? 'in' : 'enter');

  // The transform that maps the centred panel back onto the originating card (FLIP "first" state).
  const from = (() => {
    if (reducedMotion || !originRect) return null;
    const dx = originRect.left + originRect.width / 2 - window.innerWidth / 2;
    const dy = originRect.top + originRect.height / 2 - window.innerHeight / 2;
    const scale = Math.min(0.94, Math.max(0.35, originRect.width / 640));
    return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(3)})`;
  })();

  // First paint sits on the card; next frame releases to centre so the transition plays.
  useLayoutEffect(() => {
    if (reducedMotion) return undefined;
    const id = requestAnimationFrame(() => setPhase('in'));
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  const requestClose = useCallback(() => {
    if (reducedMotion || !from) {
      onClose();
      return;
    }
    setPhase('exit');
  }, [reducedMotion, from, onClose]);

  // When the collapse-back transform finishes, actually unmount.
  const onDialogTransitionEnd = (e) => {
    if (phase === 'exit' && e.propertyName === 'transform') onClose();
  };

  useEffect(() => {
    lastFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        requestClose();
        return;
      }
      if (e.key === 'Tab') {
        const f = dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!f || f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocused.current?.focus?.();
    };
  }, [requestClose]);

  const onBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget) requestClose();
    },
    [requestClose]
  );

  if (!project) return null;
  const d = project.detail || {};
  const state = statusState(project.status);
  const isConcept = state === 'concept';
  const titleId = `pd-title-${project.id}`;
  const atCard = phase !== 'in'; // enter + exit both sit on the card
  const dialogStyle = from ? { transform: atCard ? from : 'none', opacity: atCard ? 0 : 1 } : undefined;

  return createPortal(
    <div className={`pd-backdrop${atCard ? ' is-closing' : ''}`} onClick={onBackdrop}>
      <div
        className="pd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        style={dialogStyle}
        onTransitionEnd={onDialogTransitionEnd}
      >
        <button className="pd-close" onClick={requestClose} aria-label="Close" ref={closeRef}>
          {'×'}
        </button>

        <div className={`pd-media pd-media--${state}`}>
          <video
            className="pd-film"
            src={project.film}
            poster={project.poster}
            muted
            loop
            playsInline
            autoPlay={!reducedMotion}
            preload="metadata"
            aria-hidden="true"
          />
          <span className={`pd-tag pd-tag--${state}`}>
            {isConcept ? 'Concept visualization' : 'The live experience'}
          </span>
        </div>

        <div className="pd-body">
          <div className={`status status--${state}`}>
            <span className="dot" aria-hidden="true" />
            {project.status}
          </div>
          <h2 className="pd-title" id={titleId}>
            {project.name}
          </h2>
          <div className="pd-eyebrow">{project.theme.join(' · ')}</div>
          <p className="pd-summary">{d.summary || project.concept}</p>

          {d.highlights?.length > 0 && (
            <ul className="pd-highlights">
              {d.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}

          {d.tech?.length > 0 && (
            <div className="pd-tech">
              {d.tech.map((t) => (
                <span className="pd-chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="pd-actions">
            {d.links?.length > 0 &&
              d.links.map((l) => {
                const external = l.href.startsWith('http');
                return (
                  <a
                    key={l.href}
                    className="pd-link"
                    href={l.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer noopener' : undefined}
                  >
                    {l.label} {'→'}
                  </a>
                );
              })}
            {isConcept && (!d.links || d.links.length === 0) && (
              <span className="pd-note">Concept — in design, not yet built.</span>
            )}
            <span className="pd-esc" aria-hidden="true">
              Esc to close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
