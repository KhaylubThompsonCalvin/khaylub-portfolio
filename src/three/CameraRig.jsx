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
      // from the spark to the fire peak so the camera only "wakes" to the cursor as the bird does,
      // then CALMS back to zero across the finale (0.88→0.98) so the closing hero shot is fixed and
      // the mouse can't drift it.
      const calm = 1 - smoothstep(clamp01((p - 0.88) / 0.1));
      const eng = smoothstep(clamp01((p - PHOENIX.spark) / (PHOENIX.rampTo - PHOENIX.spark))) * calm;
      const kP = 1 - Math.exp(-POINTER_PARALLAX.ease * dt);
      ppx.current += (store.pointerX - ppx.current) * kP;
      ppy.current += (store.pointerY - ppy.current) * kP;
      _pos.x -= ppx.current * POINTER_PARALLAX.x * eng;
      _pos.y -= ppy.current * POINTER_PARALLAX.y * eng;
    }

    // Finale — the firebird ascends and the camera tilts UP to follow it (not the old sun-washing
    // orbit). From FINALE.from→1.0 the camera cranes up a touch and swings its LOOK target onto the
    // live phoenix position, so it pitches up to track the climb. Scroll-driven (honours reduced
    // motion). The bird is upper-left and the sun upper-right, so this tilts away from the wash.
    if (p >= FINALE.from) {
      const e = smoothstep(clamp01((p - FINALE.from) / (1 - FINALE.from)));
      const ph = store.phoenixPos;
      _olook.set(ph.x, ph.y, ph.z);
      _pos.y += FINALE.lift * e;
      // Draw the camera BACK along its view to the bird so the whole model frames with headroom
      // (it was clipping the top), then swing the look up onto it.
      _b.copy(_pos).sub(_olook).normalize();
      _pos.addScaledVector(_b, FINALE.pull * e);
      _look.lerp(_olook, FINALE.lookLerp * e);
    }

    const k = 1 - Math.exp(-FOLLOW * dt);
    camera.position.lerp(_pos, k);
    lookRef.current.lerp(_look, k);
    camera.lookAt(lookRef.current);
  });

  return null;
}
