import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { SHOTS, POINTER_PARALLAX, FINALE } from '../data/camera.js';
import { PHOENIX } from '../data/phoenix.js';

// System 3 — Camera. Keyframed shots interpolated by scrollProgress, so the camera moves
// around the in-place Wanderer and the journey reads as composition. scrollProgress
// (Lenis -> store) is the single scroll authority; this samples it each frame via
// getState() — no GSAP/ScrollTrigger (see docs/adr/ADR-001-drop-gsap.md).

const FOLLOW = 3.0; // settle smoothing (higher = snappier)
const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _b = new THREE.Vector3();
const _olook = new THREE.Vector3();
const _track = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _off = new THREE.Vector3();

// sample the shot list at scrollProgress p -> writes camera pos + look targets
function sample(p, outPos, outLook) {
  const first = SHOTS[0];
  const last = SHOTS[SHOTS.length - 1];
  if (p <= first.at) {
    outPos.fromArray(first.pos);
    outLook.fromArray(first.look);
    return;
  }
  if (p >= last.at) {
    outPos.fromArray(last.pos);
    outLook.fromArray(last.look);
    return;
  }

  let i = 0;
  while (i < SHOTS.length - 1 && p >= SHOTS[i + 1].at) i++;
  const a = SHOTS[i];
  const b = SHOTS[i + 1];
  const t = smoothstep((p - a.at) / (b.at - a.at));

  outPos.fromArray(a.pos).lerp(_b.fromArray(b.pos), t);
  outLook.fromArray(a.look).lerp(_b.fromArray(b.look), t);
}

export default function CameraRig() {
  const { camera } = useThree();
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const lookRef = useRef(new THREE.Vector3().fromArray(SHOTS[0].look));
  const ppx = useRef(0); // smoothed pointer for parallax
  const ppy = useRef(0);

  // DEV probe: expose the live camera so the phoenix flight can be solved by unprojecting a chosen
  // screen point to world space at a given scroll (the pattern used to place every shot/flight pose).
  if (import.meta.env.DEV) window.__cam = camera;

  useFrame((state, dt) => {
    const store = useExperience.getState();
    const p = store.scrollProgress;
    sample(p, _pos, _look);

    // gentle breathing drift for life (skip for reduced motion)
    if (!reducedMotion) {
      const t = state.clock.elapsedTime;
      _pos.x += Math.sin(t * 0.5) * 0.04;
      _pos.y += Math.sin(t * 0.37) * 0.03;

      // Pointer counter-drift — a whisper of parallax during the phoenix beat. Engagement ramps
      // from the spark to the fire peak; it now STAYS alive through the finale (Kt wants the closing
      // shot interactive), so the camera keeps a little counter-parallax at the summit, giving depth
      // as you fly the firebird with the cursor.
      const eng = smoothstep(clamp01((p - PHOENIX.spark) / (PHOENIX.rampTo - PHOENIX.spark)));
      const kP = 1 - Math.exp(-POINTER_PARALLAX.ease * dt);
      ppx.current += (store.pointerX - ppx.current) * kP;
      ppy.current += (store.pointerY - ppy.current) * kP;
      _pos.x -= ppx.current * POINTER_PARALLAX.x * eng;
      _pos.y -= ppy.current * POINTER_PARALLAX.y * eng;
    }

    // Finale — the camera ORBITS the still-flying firebird a full 360° and lands HEAD-ON at the end
    // of the scroll (Kt: "it should still look like flight; the camera does the rotating"). The bird
    // keeps flying/flapping along its climb (no turntable on the model); the camera circles it on a
    // ring of radius orbitDist at height orbitHeight, the orbit angle driven by scrollProgress from
    // FINALE.from→1.0. phi = 0 and 2π = the bird's FRONT, so one full loop starts and ends head-on.
    // The front offset is built from the bird's BASE facing (fx/fz, no pointer yaw), so the held
    // front view stays put while the cursor steers the bird within the shot. Scroll-driven → honours
    // reduced motion (no autonomous move).
    if (p >= FINALE.from) {
      const e = smoothstep(clamp01((p - FINALE.from) / FINALE.trackIn)); // blend the orbit rig in
      // orbit 0→1 completes by FINALE.orbitTo, then holds at 1 (front) so the camera settles head-on
      const prog = smoothstep(clamp01((p - FINALE.from) / (FINALE.orbitTo - FINALE.from)));
      const ph = store.phoenixPos;
      _olook.set(ph.x, ph.cy, ph.z); // the flying bird's visual centre (cy), not its pivot
      _fwd.set(ph.fx, 0, ph.fz); // bird's facing; the front view sits on this side
      if (_fwd.lengthSq() < 1e-4) _fwd.set(1, 0, 0);
      _fwd.normalize();
      // Rotate the front direction so the landing sits in front of the BEAK (the model's head is
      // posed turned from the body). DEV: window.__frontOffset overrides FINALE.frontOffset for live
      // tuning of the head-on landing.
      const fo =
        import.meta.env.DEV && window.__frontOffset != null
          ? window.__frontOffset
          : FINALE.frontOffset;
      if (fo) {
        const cf = Math.cos(fo);
        const sf = Math.sin(fo);
        _fwd.set(_fwd.x * cf + _fwd.z * sf, 0, -_fwd.x * sf + _fwd.z * cf);
      }
      // Rotate the front offset around the bird (Y axis) by phi — a full 360° sweep ending front-on.
      const phi = prog * Math.PI * 2;
      const ca = Math.cos(phi);
      const sa = Math.sin(phi);
      _off.set(_fwd.x * ca + _fwd.z * sa, 0, -_fwd.x * sa + _fwd.z * ca).multiplyScalar(
        FINALE.orbitDist
      );
      _off.y = FINALE.orbitHeight;
      _track.copy(_olook).add(_off);
      _pos.lerp(_track, e);
      _look.lerp(_olook, e);
    }

    // During the finale, settle FASTER so the camera keeps up with the climbing bird (otherwise it
    // lags below the ascent and the bird rides high / clips the top when you scroll quickly).
    const eFin = p >= FINALE.from ? smoothstep(clamp01((p - FINALE.from) / FINALE.trackIn)) : 0;
    const follow = FOLLOW + (FINALE.follow - FOLLOW) * eFin;
    const k = 1 - Math.exp(-follow * dt);
    camera.position.lerp(_pos, k);
    lookRef.current.lerp(_look, k);
    camera.lookAt(lookRef.current);
  });

  return null;
}
