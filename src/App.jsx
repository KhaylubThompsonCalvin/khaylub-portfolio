import { useEffect } from 'react';
import Scene from './three/Scene.jsx';
import { useScrollSetup } from './scroll/useScrollSetup.js';
import { useExperience } from './store/useExperience.js';
import { SCROLL_VH } from './data/stages.js';

import LoadGate from './ui/LoadGate.jsx';
import Nav from './ui/Nav.jsx';
import AudioManager from './components/AudioManager.jsx';
import VideoAtmosphere from './ui/VideoAtmosphere.jsx';
import Hero from './ui/Hero.jsx';
import { Philosophy, AreasOfFocus } from './ui/Sections.jsx';
import ProjectCards from './ui/ProjectCards.jsx';
import Contact from './ui/Contact.jsx';
import BottomNav from './ui/BottomNav.jsx';

export default function App() {
  const setReducedMotion = useExperience((s) => s.setReducedMotion);
  const setPointer = useExperience((s) => s.setPointer);
  // discrete (~6 changes total), never per-frame — safe to subscribe; drives reveal-and-stay
  const reachedStageIndex = useExperience((s) => s.reachedStageIndex);

  // wire scroll -> store (Lenis); stageId drives DOM reveals, no GSAP (see ADR-001)
  useScrollSetup();

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
      />

      {/* scrollable DOM overlay column — its height creates the scroll track */}
      <main
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

      <BottomNav />
    </>
  );
}
