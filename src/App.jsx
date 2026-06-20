import { useEffect } from 'react';
import Scene from './three/Scene.jsx';
import { useScrollSetup } from './scroll/useScrollSetup.js';
import { useExperience } from './store/useExperience.js';
import { SCROLL_VH } from './data/stages.js';

import LoadGate from './ui/LoadGate.jsx';
import Nav from './ui/Nav.jsx';
import SkipToWork from './ui/SkipToWork.jsx';
import Hero from './ui/Hero.jsx';
import { Philosophy, AreasOfFocus } from './ui/Sections.jsx';
import ProjectCards from './ui/ProjectCards.jsx';
import Contact from './ui/Contact.jsx';

export default function App() {
  const setReducedMotion = useExperience((s) => s.setReducedMotion);

  // wire scroll -> store (Lenis); Phase 3 adds GSAP timeline on top
  useScrollSetup();

  // mirror the OS reduced-motion preference into the store
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [setReducedMotion]);

  return (
    <>
      <LoadGate />
      <Nav />

      {/* fixed 3D stage */}
      <Scene />

      {/* scrollable DOM overlay column — its height creates the scroll track */}
      <main className="overlay" style={{ ['--scroll-vh']: `${SCROLL_VH}vh` }}>
        <Hero />
        <Philosophy />
        <AreasOfFocus />
        <ProjectCards />
        <Contact />
      </main>

      <SkipToWork />
    </>
  );
}
