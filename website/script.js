/* ============================================================
   Khaylub.com — Phase 1 JavaScript
   - Footer year
   - Scroll-reveal (IntersectionObserver)
   - Scene scaffold: a single scroll-progress source of truth +
     a lazy, inert mount point for the future Three.js Wanderer
     scene (#canvas-root). NO 3D library loads in Phase 1, so the
     bundle stays light and the perf budget (NFR-01) holds.
   ============================================================ */

(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    setFooterYear();
    initScrollReveal();
    initSceneScaffold();
  });

  /* ---------- Footer year ---------- */
  function setFooterYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- Scroll-reveal: fade + rise as elements enter view ---------- */
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const delay = Math.min(i * 60, 240); // gentle stagger
        setTimeout(() => entry.target.classList.add('is-visible'), delay);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    els.forEach((el) => obs.observe(el));
  }

  /* ============================================================
     SCENE SCAFFOLD — Phase 3 mount point (currently inert)
     ------------------------------------------------------------
     The Wanderer is authored in Blender and exported as a
     compressed GLB (see vault: "Three.js Prep — Blender Export
     Spec"). When that asset exists, set window.KHAYLUB_ENABLE_3D
     = true before this script and implement mountWandererScene().
     Already provided here:
       - KhaylubScene.progress : whole-page scroll 0..1
       - KhaylubScene.sections : per-[data-scene] progress 0..1
       - KhaylubScene.onScroll : subscribe fn(progress, sections);
         the scroll-driven camera path hooks in here.
       - lazy, reduced-motion-aware bootstrap (3D libs fetched only
         when actually enabled) + graceful fallback to the static hero.
     ============================================================ */

  const ENABLE_3D = window.KHAYLUB_ENABLE_3D === true; // OFF in Phase 1

  const Scene = {
    progress: 0,         // whole-page scroll progress 0..1
    sections: {},        // { hero, about, ascent, projects, summit } -> 0..1
    onScroll: new Set(), // subscribers: fn(progress, sections)
  };
  window.KhaylubScene = Scene;

  function initSceneScaffold() {
    const sectionEls = Array.from(document.querySelectorAll('[data-scene]'));
    if (!sectionEls.length) return;

    let ticking = false;

    const compute = () => {
      const vh = window.innerHeight || 1;
      const doc = document.documentElement;
      const max = (doc.scrollHeight - vh) || 1;
      Scene.progress = clamp(window.scrollY / max);

      sectionEls.forEach((el) => {
        const name = el.getAttribute('data-scene');
        const r = el.getBoundingClientRect();
        // 0 as the section enters from the bottom, 1 as it exits the top.
        Scene.sections[name] = clamp((vh - r.top) / (vh + r.height));
      });

      Scene.onScroll.forEach((fn) => fn(Scene.progress, Scene.sections));
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    compute();

    if (ENABLE_3D && !prefersReduced) bootstrapWandererScene();
  }

  /* Lazy-load the 3D stack only when enabled. Phase 1 = never runs. */
  async function bootstrapWandererScene() {
    const root = document.getElementById('canvas-root');
    if (!root) return;
    try {
      // ---- Phase 3 integration point (left commented = zero weight in Phase 1) ----
      // const THREE = await import('https://cdn.jsdelivr.net/npm/three/build/three.module.js');
      // const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three/examples/jsm/loaders/GLTFLoader.js');
      // const { DRACOLoader } = await import('https://cdn.jsdelivr.net/npm/three/examples/jsm/loaders/DRACOLoader.js');
      // ... create renderer + camera, append canvas to #canvas-root ...
      // const gltf = await loader.loadAsync('assets/wanderer.glb');
      // document.body.classList.add('webgl-active'); // CSS fades the static hero
      // Scene.onScroll.add((p, s) => updateCameraFromScroll(p, s)); // scroll == the climb
      mountWandererScene(root);
    } catch (err) {
      console.warn('[Khaylub] 3D scene unavailable; static hero remains.', err);
    }
  }

  // Phase 3: build the camera-follows-the-Wanderer scene here.
  function mountWandererScene(/* root */) {
    console.info('[Khaylub] Scene mount point ready (Phase 1: inert).');
  }

  function clamp(n) { return Math.min(1, Math.max(0, n)); }
})();
