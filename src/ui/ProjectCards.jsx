import { useEffect, useRef, useState } from 'react';
import { projects } from '../data/projects.js';
import { useExperience } from '../store/useExperience.js';
import ProjectDetail from './ProjectDetail.jsx';

// Phases 04–05 — the work, as five concept "worlds". Each card is a real button that opens its
// case study, which grows OUT of the card (FLIP pull-out in ProjectDetail). The concept FILM plays
// as the card background (in view only; poster under prefers-reduced-motion). On a fine pointer the
// card tilts toward the cursor with the film drifting in parallax — premium depth, no library
// (adapted from a 21st.dev reference; rebuilt in our plain-CSS idiom, gated by reduced motion).
function statusState(status = '') {
  const s = status.toLowerCase();
  if (s.startsWith('live')) return 'live';
  if (s.includes('progress')) return 'progress';
  return 'concept';
}

function ProjectCard({ project, onOpen, reducedMotion, playFilms }) {
  const ref = useRef(null);
  const tiltRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        const v = videoRef.current;
        if (!v) return;
        // playFilms is false on touch / save-data / slow links: the poster stands in (the film
        // still plays in the modal on tap), so we don't stream several 7–11 MB clips on mobile/3G.
        if (entry.isIntersecting && playFilms) v.play?.().catch(() => {});
        else v.pause?.();
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [playFilms]);

  // Pointer tilt + film parallax via CSS custom properties (no per-frame React state).
  const onPointerMove = (e) => {
    if (reducedMotion) return;
    const t = tiltRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    t.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
    t.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
    t.style.setProperty('--px', `${(-px * 16).toFixed(1)}px`);
    t.style.setProperty('--py', `${(-py * 16).toFixed(1)}px`);
  };
  const resetTilt = () => {
    const t = tiltRef.current;
    if (!t) return;
    t.style.setProperty('--ry', '0deg');
    t.style.setProperty('--rx', '0deg');
    t.style.setProperty('--px', '0px');
    t.style.setProperty('--py', '0px');
  };

  const state = statusState(project.status);

  return (
    <button
      ref={ref}
      type="button"
      className={`card--film${inView ? ' is-in' : ''}`}
      onClick={(e) => onOpen(project, e.currentTarget.getBoundingClientRect())}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      aria-haspopup="dialog"
    >
      <span className="card-tilt" ref={tiltRef}>
        <video
          ref={videoRef}
          className="card-film"
          src={project.film}
          poster={project.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
        />
        <span className="card-scrim" aria-hidden="true" />
        <span className="card-content">
          <span className="card-theme">{project.theme.join(' · ')}</span>
          <span className="card-title">{project.name}</span>
          <span className="card-concept">{project.concept}</span>
          <span className={`status status--${state}`}>
            <span className="dot" aria-hidden="true" />
            {project.status}
          </span>
        </span>
        <span className="card-cue" aria-hidden="true">
          View case study →
        </span>
      </span>
    </button>
  );
}

export default function ProjectCards() {
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const [open, setOpen] = useState(null); // { project, originRect }
  // On touch devices, Save-Data, or 2G-class links, don't autoplay the card films (posters stand
  // in; the film plays in the modal on tap). Keeps the work section light on mobile/3G where five
  // streaming clips would blow the load budget. Detected once — these don't change mid-session.
  const [lightMedia, setLightMedia] = useState(false);
  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const conn = navigator.connection;
    setLightMedia(
      Boolean(coarse || conn?.saveData || (conn?.effectiveType && /(^|\W)2g/.test(conn.effectiveType)))
    );
  }, []);
  const playFilms = !reducedMotion && !lightMedia;

  return (
    <section className="section" id="work">
      <div className="inner">
        <p className="kicker">Selected work</p>
        <p className="work-lede">
          Five ideas, one belief — that potential grows through exploration, guidance, learning,
          craftsmanship, and perseverance. Step into any world.
        </p>
        <div className="cards cards--film">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={(project, originRect) => setOpen({ project, originRect })}
              reducedMotion={reducedMotion}
              playFilms={playFilms}
            />
          ))}
        </div>
      </div>
      {open && (
        <ProjectDetail
          project={open.project}
          originRect={open.originRect}
          reducedMotion={reducedMotion}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
