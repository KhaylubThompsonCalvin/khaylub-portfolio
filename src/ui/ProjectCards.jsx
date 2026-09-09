import { useEffect, useMemo, useRef, useState } from 'react';
import { projects } from '../data/projects.js';
import { camps } from '../data/copy.js';
import { useExperience } from '../store/useExperience.js';
import ProjectDetail from './ProjectDetail.jsx';

// The Camps beat - the work, as five concept "worlds". Each card is a real button that opens its
// case study, which grows OUT of the card (FLIP pull-out in ProjectDetail). The concept FILM plays
// as the card background while the card is in view - all in-view films run simultaneously (the
// camps read as living worlds) under one shared IntersectionObserver, paused off-screen and when
// the tab is hidden. On a fine pointer the card tilts toward the cursor with the film drifting in
// parallax - premium depth, no library (adapted from a 21st.dev reference; rebuilt in our
// plain-CSS idiom, gated by reduced motion).
function statusState(status = '') {
  const s = status.toLowerCase();
  if (s.startsWith('live')) return 'live';
  if (s.includes('progress')) return 'progress';
  return 'concept';
}

function ProjectCard({ project, index, onOpen, reducedMotion, observe }) {
  const ref = useRef(null);
  const tiltRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  // Register with the section's shared observer; it drives both the reveal class and playback.
  useEffect(() => observe(ref.current, videoRef.current, setInView), [observe]);

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
      style={{ '--card-i': index }}
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
  // Films never autoplay for users who asked for less (reduced motion) or opted into data
  // saving, and never on 2G-class links where five clips would blow the budget. The old
  // blanket "no autoplay on touch" gate is gone: measured at 375px with 4x CPU throttle,
  // three in-view films play at ~43 fps average - within budget - and preload="none" +
  // play-only-in-view means nothing streams until the visitor actually reaches the camps.
  const [lightMedia, setLightMedia] = useState(false);
  useEffect(() => {
    const conn = navigator.connection;
    setLightMedia(
      Boolean(conn?.saveData || (conn?.effectiveType && /(^|\W)2g/.test(conn.effectiveType)))
    );
  }, []);
  const playFilms = !reducedMotion && !lightMedia;

  // ONE shared IntersectionObserver for all five cards (was one per card). It flips the
  // reveal class and keeps a registry so playback can be re-synced as a set - on visibility
  // (in view / off screen), on tab hide/show, and when the playFilms gates change.
  const registry = useRef(new Map()); // card el -> { video, inView }
  const playFilmsRef = useRef(playFilms);
  const syncAll = () => {
    const hidden = document.hidden;
    for (const rec of registry.current.values()) {
      const v = rec.video;
      if (!v) continue;
      if (rec.inView && playFilmsRef.current && !hidden) v.play?.().catch(() => {});
      else v.pause?.();
    }
  };
  useEffect(() => {
    playFilmsRef.current = playFilms;
    syncAll();
  }, [playFilms]);

  const io = useMemo(
    () =>
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const rec = registry.current.get(entry.target);
            if (!rec) continue;
            rec.inView = entry.isIntersecting;
            rec.setInView(entry.isIntersecting);
          }
          syncAll();
        },
        { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
      ),
    []
  );
  useEffect(() => {
    const onVisibility = () => syncAll();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
    };
  }, [io]);

  // Each card registers its root element + video; returns the unobserve cleanup.
  const observe = useMemo(
    () => (el, video, setInView) => {
      if (!el) return undefined;
      registry.current.set(el, { video, setInView, inView: false });
      io.observe(el);
      return () => {
        io.unobserve(el);
        registry.current.delete(el);
      };
    },
    [io]
  );

  return (
    <section className="section" id="work">
      <div className="inner">
        {/* Wrapped so the intro can carry the beats' scrim backplate without washing the cards  - 
            on narrow viewports the Wanderer walks behind this text. */}
        <div className="work-intro">
          <p className="kicker">{camps.kicker}</p>
          <p className="work-lede">{camps.lede}</p>
        </div>
        <div className="cards cards--film">
          {projects.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              index={i}
              onOpen={(project, originRect) => setOpen({ project, originRect })}
              reducedMotion={reducedMotion}
              observe={observe}
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
