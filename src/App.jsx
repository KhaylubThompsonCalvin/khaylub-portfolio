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
  //  • the DOM column fades out across the finale so the phoenix close-up is clean.
  useEffect(() => {
    const root = document.documentElement;
    const mix = (a, b, t) => Math.round(a + (b - a) * t);
    const apply = (p) => {
      const day = dayAt(p);
      // light text at night (236,230,218) → dark ink by day (36,28,18); muted likewise
      root.style.setProperty(
        '--ink',
        `rgb(${mix(236, 36, day)},${mix(230, 28, day)},${mix(218, 18, day)})`
      );
      root.style.setProperty(
        '--muted',
        `rgb(${mix(168, 91, day)},${mix(160, 81, day)},${mix(146, 63, day)})`
      );
      const el = overlayRef.current;
      if (el) el.style.opacity = String(1 - Math.min(1, Math.max(0, (p - 0.95) / 0.05)));
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
      <VideoAtmosphere
        src="/assets/video/summit-clouds.mp4"
        blend="soft-light"
        max={0.4}
        fadeIn={[0.84, 0.93]}
        fadeOut={[0.94, 0.99]}
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
