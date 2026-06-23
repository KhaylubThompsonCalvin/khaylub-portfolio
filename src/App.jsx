import { useEffect, useRef } from 'react';
import Scene from './three/Scene.jsx';
import { useScrollSetup } from './scroll/useScrollSetup.js';
import { useExperience } from './store/useExperience.js';
import { SCROLL_VH } from './data/stages.js';
import { dayAt } from './data/palette.js';

import LoadGate from './ui/LoadGate.jsx';
import Nav from './ui/Nav.jsx';
import AudioManager from './components/AudioManager.jsx';
import VideoAtmosphere from './ui/VideoAtmosphere.jsx';
import Hero from './ui/Hero.jsx';
import { Philosophy, AreasOfFocus } from './ui/Sections.jsx';
import ProjectCards from './ui/ProjectCards.jsx';
import Contact from './ui/Contact.jsx';

export default function App() {
  const setReducedMotion = useExperience((s) => s.setReducedMotion);
  const setPointer = useExperience((s) => s.setPointer);
  // discrete (~6 changes total), never per-frame — safe to subscribe; drives reveal-and-stay
  const reachedStageIndex = useExperience((s) => s.reachedStageIndex);

  const overlayRef = useRef(null);

  // wire scroll -> store (Lenis); stageId drives DOM reveals, no GSAP (see ADR-001)
  useScrollSetup();

  // Drive the night→sunny chrome from scroll (imperative via store.subscribe — no re-render):
  //  • text colour flips light→dark with the day so it stays readable on the dark night sky and
  //    the bright sunny summit (the accessible version of Noomo's sectionColor);
  //  • a --fire ramp lights the closing contact links in step with the phoenix's fire.
  useEffect(() => {
    const root = document.documentElement;
    const mix = (a, b, t) => Math.round(a + (b - a) * t);
    // The intro beats are vertically centred in tall, freely-scrolling sections, so their copy
    // travels up behind the fixed nav (which has no backdrop) and collides with the brand mark. A
    // full-width top scrim can't fix it — the phoenix shares that strip from ~0.5 on — so fade the
    // DOM copy out at the top edge instead. Only the short single-viewport beats (#work's tall card
    // stack is excluded so its lower cards stay readable while scrolling). The fade is applied only
    // while a block is in the nav band; otherwise control is handed back to the reveal-and-stay CSS
    // so the entrance reveal is untouched. A few rect reads per scroll — cheap, no React re-render.
    const NAV_BAND = 130; // px — the fixed nav lives in roughly the top 130px
    const topFade = Array.from(
      document.querySelectorAll('#arrival .inner, #philosophy .inner, #focus .inner')
    );
    const apply = (p) => {
      const day = dayAt(p);
      for (const el of topFade) {
        const top = el.getBoundingClientRect().top;
        if (top < NAV_BAND) el.style.opacity = String(Math.max(0, top / NAV_BAND));
        else if (el.style.opacity !== '') el.style.opacity = '';
      }
      // light text at night (236,230,218) → dark ink by day (36,28,18); muted likewise
      root.style.setProperty(
        '--ink',
        `rgb(${mix(236, 36, day)},${mix(230, 28, day)},${mix(218, 18, day)})`
      );
      root.style.setProperty(
        '--muted',
        `rgb(${mix(168, 91, day)},${mix(160, 81, day)},${mix(146, 63, day)})`
      );
      // --scrim: a translucent wash of the current sky tone, painted behind the DOM copy (index.css)
      // so it stays legible wherever the Wanderer passes under a text column. The overlay already
      // sits above the 3D, so this is a contrast fix, not z-order: the scrim tracks the sky
      // (night navy → day cream) opposite the ink, restoring text-on-sky contrast at every beat.
      root.style.setProperty(
        '--scrim',
        `${mix(14, 236, day)},${mix(18, 232, day)},${mix(32, 224, day)}`
      );
      // --fire: 0→1 across the summit window (the same beat the phoenix ignites), so the closing
      // contact links brighten WITH the firebird's fire — the spark→fire motif resolving into the
      // call-to-action. The overlay is NOT faded out at the end any more: the lit links + phoenix
      // are the closing image, so they stay.
      const fire = Math.min(1, Math.max(0, (p - 0.8) / 0.18));
      root.style.setProperty('--fire', (fire * fire * (3 - 2 * fire)).toFixed(3));
    };
    apply(useExperience.getState().scrollProgress);
    return useExperience.subscribe((s) => apply(s.scrollProgress));
  }, []);

  // mirror the OS reduced-motion preference into the store
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [setReducedMotion]);

  // mirror the pointer into the store (-1..1) for the phoenix parallax. Frame loops read it via
  // getState() and gate it by reduced motion, so the listener stays unconditional and cheap.
  useEffect(() => {
    const onMove = (e) => {
      setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1)
      );
    };
    const recenter = () => setPointer(0, 0);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', recenter);
    document.addEventListener('pointerleave', recenter);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', recenter);
      document.removeEventListener('pointerleave', recenter);
    };
  }, [setPointer]);

  return (
    <>
      <LoadGate />
      <Nav />
      <AudioManager />

      {/* fixed 3D stage */}
      <Scene />

      {/* Ground fog: a low, bottom-anchored plate hugging the trail through the dark opening beats
          (arrival → philosophy). feather='top' masks the upper frame so the fog never climbs into
          the night sky or over the Wanderer's head; soft-light ties it to the live sky tone, and a
          low max keeps the black sky and his silhouette intact. Scrubbed by scroll, so the mist
          drifts as you descend the page and rests when you stop. Mounted FIRST so it sits beneath
          the other plates. */}
      <VideoAtmosphere
        src="/assets/video/fog-trail.mp4"
        blend="soft-light"
        max={0.4}
        fadeIn={[0, 0.05]}
        fadeOut={[0.22, 0.3]}
        scrub={[0, 0.21]}
        anchor="bottom"
        feather="top"
      />

      {/* video atmosphere plates: dawn grass over the open early beats; embers glowing through
          the phoenix → summit window (screen blend drops the black, so only sparks show). */}
      <VideoAtmosphere
        src="/assets/video/dawn-grass.mp4"
        blend="soft-light"
        max={0.45}
        fadeIn={[0, 0.06]}
        fadeOut={[0.3, 0.45]}
      />
      <VideoAtmosphere
        src="/assets/video/embers.mp4"
        blend="screen"
        max={0.7}
        fadeIn={[0.46, 0.58]}
      />
      {/* Summit clouds: scrubbed by scroll across the final approach and FROZEN on its last frame
          at the summit hold — a still, frame-matched sky behind the Wanderer's arrival, not looping
          motion drifting behind a static beat. */}
      <VideoAtmosphere
        src="/assets/video/summit-clouds.mp4"
        blend="soft-light"
        max={0.4}
        fadeIn={[0.82, 0.92]}
        scrub={[0.82, 0.97]}
      />

      {/* scrollable DOM overlay column — its height creates the scroll track */}
      <main
        ref={overlayRef}
        className="overlay"
        data-reached={reachedStageIndex}
        style={{ ['--scroll-vh']: `${SCROLL_VH}vh` }}
      >
        <Hero />
        <Philosophy />
        <AreasOfFocus />
        <ProjectCards />
        <Contact />
      </main>
    </>
  );
}
