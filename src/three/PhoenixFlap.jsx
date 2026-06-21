import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import {
  PHOENIX,
  FLIGHT,
  EMBER_INTENSITY,
  FIRE_INTENSITY,
  FLAP_SLOW,
  FLAP_FAST,
  SCALE_MIN,
  SCALE_MAX,
  HEADING_OFFSET,
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

// Sample the flight path at scroll fraction p into `out`. Picks the FLIGHT segment by its
// `at` keys (so non-uniform spacing is honoured), then Catmull-Rom interpolates that segment
// using the two surrounding control points (endpoints are clamped by duplication).
function sampleFlight(p, out) {
  const last = FLIGHT[FLIGHT.length - 1];
  if (p <= FLIGHT[0].at) return out.fromArray(FLIGHT[0].pos);
  if (p >= last.at) return out.fromArray(last.pos);

  let i = 0;
  while (i < FLIGHT.length - 1 && p > FLIGHT[i + 1].at) i++;
  const a = FLIGHT[i];
  const b = FLIGHT[i + 1];
  const t = (p - a.at) / (b.at - a.at);
  const p0 = (FLIGHT[i - 1] || a).pos;
  const p3 = (FLIGHT[i + 2] || b).pos;
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

  // The feather material(s) carry the baked ember emission; the body material is matte
  // (emissive black). Collect just the emissive ones so the ramp leaves the body alone.
  const emissiveMats = useMemo(() => {
    const found = new Set();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m?.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) found.add(m);
      }
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

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const p = useExperience.getState().scrollProgress;

    // Dormant before the spark — keep it out of the early Wanderer-establishing beats.
    if (p < PHOENIX.spark) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Ignition fade and the ember->fire ramp, both from one scrollProgress.
    const emerge = smoothstep(clamp01((p - PHOENIX.spark) / PHOENIX.emergeSpan));
    const ramp = smoothstep(clamp01((p - PHOENIX.rampFrom) / (PHOENIX.rampTo - PHOENIX.rampFrom)));

    // Position along the Catmull-Rom path; heading banks toward the path tangent.
    sampleFlight(p, pos);
    g.position.copy(pos);
    sampleFlight(Math.min(1, p + 0.01), ahead);
    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    if (dx || dz) g.rotation.y = Math.atan2(dx, dz) + HEADING_OFFSET;

    // Small/distant -> modest growth, with the quick scale-in as it ignites.
    g.scale.setScalar(lerp(SCALE_MIN, SCALE_MAX, ramp) * emerge);

    // Ember glow -> fire on the feather material.
    const intensity = lerp(EMBER_INTENSITY, FIRE_INTENSITY, ramp) * emerge;
    for (const m of emissiveMats) m.emissiveIntensity = intensity;

    // Wingbeat quickens as it ignites; calmed (not frozen) under reduced motion, and the
    // autonomous bob is dropped there so only the scroll-driven flight remains.
    if (flapAction.current) {
      flapAction.current.timeScale = reducedMotion ? FLAP_SLOW : lerp(FLAP_SLOW, FLAP_FAST, ramp);
    }
    if (!reducedMotion) {
      const t = state.clock.elapsedTime;
      g.position.y += Math.sin(t * 0.8) * 0.12 * emerge;
    }
  });

  return <primitive ref={group} object={scene} {...props} />;
}
