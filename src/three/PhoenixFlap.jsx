import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { BLOOM_LAYER } from './SelectiveBloom.jsx';
import {
  PHOENIX,
  FLIGHT,
  EMBER_INTENSITY,
  FIRE_INTENSITY,
  EMBER_COLOR,
  FIRE_COLOR,
  GLIDE_PITCH,
  FLAP_SLOW,
  FLAP_FAST,
  SCALE_MIN,
  SCALE_MAX,
  HEADING_OFFSET,
  POINTER,
  SCROLL_FLAIR,
} from '../data/phoenix.js';

// Source GLB lives in /public, served from the site root (matches wanderer-web.glb).
const MODEL = '/assets/models/PhoenixFlap.web.glb';
useGLTF.preload(MODEL);

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Uniform Catmull-Rom basis on one axis: smooth curve through p1->p2 using neighbours p0,p3.
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
};

// Sample a keyframed path at scroll fraction p into `out`. Picks the segment by its `at` keys
// (so non-uniform spacing is honoured), then Catmull-Rom interpolates that segment using the two
// surrounding control points (endpoints are clamped by duplication). Works for any path array
// (the main FLIGHT and the early GLIMPSE share it).
function samplePath(path, p, out) {
  const last = path[path.length - 1];
  if (p <= path[0].at) return out.fromArray(path[0].pos);
  if (p >= last.at) return out.fromArray(last.pos);

  let i = 0;
  while (i < path.length - 1 && p > path[i + 1].at) i++;
  const a = path[i];
  const b = path[i + 1];
  const t = (p - a.at) / (b.at - a.at);
  const p0 = (path[i - 1] || a).pos;
  const p3 = (path[i + 2] || b).pos;
  out.x = catmull(p0[0], a.pos[0], b.pos[0], p3[0], t);
  out.y = catmull(p0[1], a.pos[1], b.pos[1], p3[1], t);
  out.z = catmull(p0[2], a.pos[2], b.pos[2], p3[2], t);
  return out;
}

// "Spark of the Summit": the phoenix is dormant until the midpoint, then an ember fades in
// (~0.50), arcs through the far background behind the Wanderer along a Catmull-Rom path, and
// its emission + wingbeat ramp ember -> fire across 0.50 -> 0.98, peaking at the summit close.
// Path, ramps, and clip pick are scroll-driven via getState() (ADR-001 idiom — no per-frame
// React re-render, no GSAP). Choreography lives in data/phoenix.js.
export default function PhoenixFlap(props) {
  const group = useRef();
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const { scene, animations } = useGLTF(MODEL);
  const { actions, names } = useAnimations(animations, group);

  // Scratch vectors reused every frame (no per-frame allocation).
  const pos = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);

  // Ember/fire emissive colours + a scratch colour lerped between them each frame.
  const emberCol = useMemo(() => new THREE.Color(EMBER_COLOR), []);
  const fireCol = useMemo(() => new THREE.Color(FIRE_COLOR), []);
  const emitCol = useMemo(() => new THREE.Color(), []);

  // Smoothed interaction inputs (eased toward the store each frame so the bird never snaps).
  const px = useRef(0); // pointer x, smoothed
  const py = useRef(0); // pointer y, smoothed
  const flair = useRef(0); // normalized |scroll velocity|, smoothed

  // The feather material(s) carry the baked ember emission; the body material is matte
  // (emissive black). Collect just the emissive ones so the ramp leaves the body alone.
  const emissiveMats = useMemo(() => {
    const found = new Set();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let emissive = false;
      for (const m of mats) {
        if (!m) continue;
        // The bird flies ~10 m out (far -X) to read as a distant 3 m firebird, which puts it deep
        // in the scene fog (7–26 m). Exempt it: a glowing phoenix shouldn't haze out like terrain,
        // and the bloom pass already renders fog-free. Keeps the form crisp at any distance.
        m.fog = false;
        if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) {
          found.add(m);
          emissive = true;
        }
      }
      // Opt only the ember/fire feather meshes into selective bloom, so the body stays solid.
      if (emissive) o.layers.enable(BLOOM_LAYER);
    });
    return [...found];
  }, [scene]);

  const flapAction = useRef(null);

  useEffect(() => {
    // AnimationAction defaults to LoopRepeat (Infinity), so play() loops the wingbeat.
    const flap = names.find((n) => /flap/i.test(n)) || names[0];
    const action = actions[flap];
    flapAction.current = action ?? null;
    action?.reset().play();

    if (import.meta.env.DEV) {
      console.log('%c[Phoenix] GLB animation clips:', 'color:#caa46f', names);
      // meshopt decodes at runtime, so this is the REAL bind-pose size (units ≈ m).
      const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      console.log('%c[Phoenix] rendered bbox @scale 1 (units≈m):', 'color:#caa46f', {
        x: +size.x.toFixed(3),
        y: +size.y.toFixed(3),
        z: +size.z.toFixed(3),
      });
    }
  }, [actions, names, scene]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const store = useExperience.getState();
    const p = store.scrollProgress;

    // Before the spark the phoenix is UNSEEN. Its presence in the philosophy beat is felt only as a
    // shadow sweeping the Wanderer's back (three/ForeshadowShadow.jsx) — not a visible bird in the
    // sky. Keep it hidden and bleed the interaction state back to rest so the main regime starts
    // clean, not snapped.
    if (p < PHOENIX.spark) {
      g.visible = false;
      const decay = Math.min(1, dt * 4);
      px.current -= px.current * decay;
      py.current -= py.current * decay;
      flair.current -= flair.current * decay;
      return;
    }
    g.visible = true;

    // Ignition fade and the ember->fire ramp, both from one scrollProgress.
    const emerge = smoothstep(clamp01((p - PHOENIX.spark) / PHOENIX.emergeSpan));
    const ramp = smoothstep(clamp01((p - PHOENIX.rampFrom) / (PHOENIX.rampTo - PHOENIX.rampFrom)));

    // Interaction is gated by reduced motion and scaled by the ramp, so it's barely-there at the
    // spark and fully responsive at the fire/contact beat. Inputs are eased toward the store. It
    // also CALMS to zero across the finale (0.88→0.98): the closing is a fixed cinematic hero shot,
    // so moving the mouse must not spin or shove the firebird as it ascends.
    const calm = 1 - smoothstep(clamp01((p - 0.88) / 0.1));
    const live = (reducedMotion ? 0 : ramp) * calm;
    const kP = 1 - Math.exp(-POINTER.ease * dt);
    px.current += ((live ? store.pointerX : 0) - px.current) * kP;
    py.current += ((live ? store.pointerY : 0) - py.current) * kP;
    const target = live ? clamp01(Math.abs(store.scrollVelocity) / SCROLL_FLAIR.ref) : 0;
    flair.current += (target - flair.current) * (1 - Math.exp(-SCROLL_FLAIR.ease * dt));

    // Position along the Catmull-Rom path; heading follows the path tangent.
    samplePath(FLIGHT, p, pos);
    g.position.copy(pos);
    samplePath(FLIGHT, Math.min(1, p + 0.01), ahead);
    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    if (dx || dz) g.rotation.y = Math.atan2(dx, dz) + HEADING_OFFSET;

    // Pointer parallax: drift toward the cursor and bank into it (position stays scroll-anchored;
    // this is a small offset/tilt on top of the path).
    g.position.x += px.current * POINTER.drift[0] * live;
    g.position.y += py.current * POINTER.drift[1] * live;
    g.rotation.y += px.current * POINTER.yaw * live;
    g.rotation.z = -px.current * POINTER.bank * live;
    // Forward glide attitude so the talons trail rather than hang straight down; eased to 0 by the
    // summit (0.85→1.0) so the locked freeze pose keeps its upright presentation.
    g.rotation.x = GLIDE_PITCH * (1 - smoothstep(clamp01((p - 0.85) / 0.15)));

    // Small/distant -> modest growth, with the quick scale-in as it ignites.
    g.scale.setScalar(lerp(SCALE_MIN, SCALE_MAX, ramp) * emerge);

    // Ember glow -> fire, plus the scroll-velocity flare AND the cursor fanning the fire: moving
    // the mouse (away from centre, while engaged) lights the embers up brighter — the pointer
    // controls both where it flies and how it glows.
    const pointerGlow =
      live * Math.min(1, Math.hypot(px.current, py.current)) * POINTER.emberBoost;
    const intensity =
      (lerp(EMBER_INTENSITY, FIRE_INTENSITY, ramp) +
        SCROLL_FLAIR.emberBoost * flair.current +
        pointerGlow) *
      emerge;
    // Ember orange -> fire gold along the ramp, so the bird reads as fire (not a pale lit bird).
    emitCol.copy(emberCol).lerp(fireCol, ramp);
    for (const m of emissiveMats) {
      m.emissive.copy(emitCol);
      m.emissiveIntensity = intensity;
    }

    // Wingbeat quickens as it ignites and flares with scroll speed; calmed (not frozen) under
    // reduced motion, where the autonomous bob is also dropped so only the scroll flight remains.
    if (flapAction.current) {
      const base = reducedMotion
        ? FLAP_SLOW
        : lerp(FLAP_SLOW, FLAP_FAST, ramp) + SCROLL_FLAIR.flapBoost * flair.current;
      // As it reaches the sun (0.93→1.0) the wingbeat drops into slow motion and FREEZES on a
      // held pose — the climactic beat before "something amazing" (see three/FinaleReveal.jsx).
      const freeze = smoothstep(clamp01((p - 0.93) / 0.07));
      flapAction.current.timeScale = base * (1 - freeze);
    }
    if (!reducedMotion) {
      const t = state.clock.elapsedTime;
      g.position.y += Math.sin(t * 0.8) * 0.12 * emerge;
    }

    // Publish the live position so CameraRig can orbit the bird in the finale (mutated in place).
    const pp = store.phoenixPos;
    pp.x = g.position.x;
    pp.y = g.position.y;
    pp.z = g.position.z;
  });

  return <primitive ref={group} object={scene} {...props} />;
}
