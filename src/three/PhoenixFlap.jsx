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
  BODY_EMBER,
  BODY_FIRE,
  HEADING_OFFSET,
  POINTER,
  SCROLL_FLAIR,
  SUMMIT_INTERACT,
} from '../data/phoenix.js';

// Source GLB lives in /public, served from the site root (matches wanderer-web.glb).
const MODEL = '/assets/models/PhoenixFlap.web.glb';
useGLTF.preload(MODEL);

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// The GLB's origin sits BELOW the bird's body — its visual centre is ~this many LOCAL units above
// the pivot (measured from the rendered world bbox: ~0.30 × scale). Published scaled as
// phoenixPos.cy so the finale camera frames the bird centred on its body, not on the pivot under it.
const PHOENIX_CENTER_LOCAL_Y = 0.3;

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
  const yaw = useRef(0); // smoothed heading — eased toward the path tangent so turns never snap
  const yawInit = useRef(false); // snap to the first valid heading, then ease from there

  // The feather material(s) carry the baked ember emission; the body material is matte
  // (emissive black). Collect just the emissive ones so the ramp leaves the body alone.
  const { emissiveMats, bodyMats } = useMemo(() => {
    const feathers = new Set();
    const body = new Set();
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
          feathers.add(m); // ember/fire feathers — bloom + full emission ramp
          emissive = true;
        } else if (m.emissive) {
          body.add(m); // matte body/head — warmed (no bloom) so the bird reads as fire-lit
        }
      }
      // Opt only the ember/fire feather meshes into selective bloom, so the body stays solid.
      if (emissive) o.layers.enable(BLOOM_LAYER);
    });
    return { emissiveMats: [...feathers], bodyMats: [...body] };
  }, [scene]);

  const flapAction = useRef(null);

  useEffect(() => {
    // AnimationAction defaults to LoopRepeat (Infinity), so play() loops the wingbeat.
    const flap = names.find((n) => /flap/i.test(n)) || names[0];
    const action = actions[flap];
    flapAction.current = action ?? null;
    action?.reset().play();

    if (import.meta.env.DEV) {
      window.__flap = action ?? null; // expose the wingbeat action so verification can read timeScale
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
    // DEV: expose the live bird so the flight + heading can be sampled/verified (window.__phoenix).
    if (import.meta.env.DEV) window.__phoenix = g;
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

    // Inputs are eased toward the store; engagement is gated by reduced motion and scaled by the
    // ramp (barely-there at the spark, fully responsive by the fire beat).
    // Pointer engagement. It used to CALM to zero across the finale; now it stays alive and WAKES
    // at the summit (Kt) so the firebird becomes the interactive closing hero. `summit` ramps in
    // across SUMMIT_INTERACT.from→1.0 and boosts the follow / turn / glow / wingbeat below.
    const summit = smoothstep(clamp01((p - SUMMIT_INTERACT.from) / (1 - SUMMIT_INTERACT.from)));
    const live = reducedMotion ? 0 : ramp;
    const kP = 1 - Math.exp(-POINTER.ease * dt);
    px.current += ((live ? store.pointerX : 0) - px.current) * kP;
    py.current += ((live ? store.pointerY : 0) - py.current) * kP;
    const target = live ? clamp01(Math.abs(store.scrollVelocity) / SCROLL_FLAIR.ref) : 0;
    flair.current += (target - flair.current) * (1 - Math.exp(-SCROLL_FLAIR.ease * dt));

    // Idle "presentation" gate: 1 when the cursor rests near centre at the summit, 0 when you're
    // actively steering. Drives a slow show-off sway + idle wing-beat below so the model stays alive
    // at rest and turns to show its profile, then hands control straight back to your cursor.
    const idlePresent = reducedMotion
      ? 0
      : summit * clamp01(1 - Math.hypot(px.current, py.current) * 2);
    const presentSway = Math.sin(state.clock.elapsedTime * SUMMIT_INTERACT.presentSpeed);

    // Position along the Catmull-Rom path.
    samplePath(FLIGHT, p, pos);
    g.position.copy(pos);
    // Heading: face the travel direction, but EASED with shortest-angle interpolation so the bird
    // BANKS smoothly through the summit turn-back instead of snapping when the tangent swings (the
    // old far-out-and-back path flipped the yaw ~180° — the unnatural twist). When the motion is
    // near-vertical (the climb), the horizontal tangent is tiny and noisy, so HOLD the last heading
    // rather than chasing jitter. Pointer yaw is still added on top below.
    samplePath(FLIGHT, Math.min(1, p + 0.02), ahead);
    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    if (Math.hypot(dx, dz) > 0.02) {
      const targetYaw = Math.atan2(dx, dz) + HEADING_OFFSET;
      if (!yawInit.current) {
        yaw.current = targetYaw;
        yawInit.current = true;
      } else {
        let d = targetYaw - yaw.current;
        d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest angle — never wraps ±2π into a spin
        yaw.current += d * (1 - Math.exp(-2.6 * dt));
      }
    }
    g.rotation.y = yaw.current;

    // Pointer parallax: drift toward the cursor and bank into it (position stays scroll-anchored;
    // an offset/tilt on top of the path). Boosted at the summit so it clearly follows + turns to you.
    const driftX = POINTER.drift[0] + SUMMIT_INTERACT.drift[0] * summit;
    const driftY = POINTER.drift[1] + SUMMIT_INTERACT.drift[1] * summit;
    g.position.x += px.current * driftX * live;
    g.position.y += py.current * driftY * live;
    g.rotation.y += px.current * (POINTER.yaw + SUMMIT_INTERACT.yaw * summit) * live;
    g.rotation.z = -px.current * (POINTER.bank + SUMMIT_INTERACT.bank * summit) * live;
    // Idle show-off sway — turns the bird within the held front shot (the camera uses its BASE
    // heading, so this reads as the firebird presenting itself); cursor steering overrides it.
    g.rotation.y += presentSway * SUMMIT_INTERACT.presentYaw * idlePresent;
    g.rotation.z += presentSway * SUMMIT_INTERACT.presentBank * idlePresent;
    // Forward glide attitude so the talons trail rather than hang straight down; eased to 0 by the
    // summit (0.85→1.0) so the locked freeze pose keeps its upright presentation.
    g.rotation.x = GLIDE_PITCH * (1 - smoothstep(clamp01((p - 0.85) / 0.15)));

    // Small/distant -> modest growth, with the quick scale-in as it ignites; then a big summit
    // SWELL so the closing firebird reads large and close (Kt: "a lot bigger" at the end).
    const scl =
      lerp(SCALE_MIN, SCALE_MAX, ramp) * emerge * (1 + SUMMIT_INTERACT.scaleBoost * summit);
    g.scale.setScalar(scl);

    // Ember glow -> fire, plus the scroll-velocity flare AND the cursor fanning the fire: moving
    // the mouse (away from centre, while engaged) lights the embers up brighter — the pointer
    // controls both where it flies and how it glows.
    const pointerGlow =
      live *
      Math.min(1, Math.hypot(px.current, py.current)) *
      (POINTER.emberBoost + SUMMIT_INTERACT.emberBoost * summit);
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
    // Warm the matte body/head with the same ember->fire tint at a low intensity (NOT on the bloom
    // layer), so the whole bird reads as fire-lit rather than a grey bird with glowing orange wings.
    const bodyI = lerp(BODY_EMBER, BODY_FIRE, ramp) * emerge;
    for (const m of bodyMats) {
      m.emissive.copy(emitCol);
      m.emissiveIntensity = bodyI;
    }

    // Wingbeat quickens as it ignites and flares with scroll speed; calmed (not frozen) under
    // reduced motion, where the autonomous bob is also dropped so only the scroll flight remains.
    if (flapAction.current) {
      const base = reducedMotion
        ? FLAP_SLOW
        : lerp(FLAP_SLOW, FLAP_FAST, ramp) + SCROLL_FLAIR.flapBoost * flair.current;
      // At the summit the wings DON'T freeze any more (Kt): the firebird keeps cruising at `base`
      // so it reads as flying front-on in the sky through the held closing tail. Moving the cursor
      // (wake) or resting it (idleFlap) still ADD to the beat — it just never drops to a frozen pose.
      const wake =
        SUMMIT_INTERACT.flapWake * summit * live * Math.min(1, Math.hypot(px.current, py.current));
      const idleFlap = SUMMIT_INTERACT.presentFlap * idlePresent; // gentle extra beat while presenting
      flapAction.current.timeScale = base + wake + idleFlap;
    }
    if (!reducedMotion) {
      const t = state.clock.elapsedTime;
      g.position.y += Math.sin(t * 0.8) * 0.12 * emerge;
      // Summit hover — a gentle autonomous drift so the held firebird reads as FLYING in the sky,
      // not parked. The finale camera re-centres on it each frame, so this parallaxes the sky
      // behind it. Gated by `summit`, so the flight path before the close is untouched.
      g.position.x += Math.sin(t * 0.5) * SUMMIT_INTERACT.hoverSwayX * summit;
      g.position.y += Math.sin(t * 0.65 + 1.3) * SUMMIT_INTERACT.hoverSwayY * summit;
    }

    // Publish the live position so CameraRig can orbit the bird in the finale (mutated in place).
    const pp = store.phoenixPos;
    pp.x = g.position.x;
    pp.y = g.position.y;
    pp.z = g.position.z;
    // visual-centre Y (the body sits ~PHOENIX_CENTER_LOCAL_Y × scale above the pivot) — the finale
    // camera aims here so the firebird frames CENTRED, not its pivot (which is below the body).
    pp.cy = g.position.y + scl * PHOENIX_CENTER_LOCAL_Y;
    // base facing (scroll heading WITHOUT the pointer yaw) — the finale camera builds its head-on
    // FRONT view from this, so moving the mouse turns the bird WITHIN the shot instead of dragging
    // the camera around with it. local +Z is the beak, so forward = (sin yaw, 0, cos yaw).
    pp.fx = Math.sin(yaw.current);
    pp.fz = Math.cos(yaw.current);
  });

  return <primitive ref={group} object={scene} {...props} />;
}
