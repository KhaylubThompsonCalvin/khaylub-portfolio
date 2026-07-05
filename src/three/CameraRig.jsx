import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { samplePath, segmentEase, POINTER_PARALLAX, FINALE } from '../data/camera.js';
import { PHOENIX } from '../data/phoenix.js';

// System 3 — Camera. Keyframed shots interpolated by scrollProgress, so the camera moves
// around the in-place Wanderer and the journey reads as composition. scrollProgress
// (Lenis -> store) is the single scroll authority; this samples it each frame via
// getState() — no GSAP/ScrollTrigger (see docs/adr/ADR-001-drop-gsap.md).
// The path math lives in data/camera.js (samplePath) so the audit tooling and the frame
// loop share it; see the "Motion feel" note there for the 2026-07-05 easing rework.

// Settle smoothing (higher = snappier): 1/FOLLOW is the time constant, so 7 ≈ a 0.14s settle.
// Was 3.0 (τ ≈ 0.33s) — the camera trailed a scroll flick by a beat, which read as disconnect.
const FOLLOW = 7.0;
const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _olook = new THREE.Vector3();
const _track = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _off = new THREE.Vector3();

// scratch for samplePath — plain arrays, copied into the vectors each frame
const _sampled = { pos: [0, 0, 0], look: [0, 0, 0] };
function sample(p, outPos, outLook) {
  samplePath(p, _sampled);
  outPos.fromArray(_sampled.pos);
  outLook.fromArray(_sampled.look);
}

export default function CameraRig() {
  const { camera } = useThree();
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const lookRef = useRef(
    (() => {
      samplePath(0, _sampled);
      return new THREE.Vector3().fromArray(_sampled.look);
    })()
  );
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
      const e = smoothstep(clamp01((p - FINALE.from) / FINALE.trackIn)); // position blends in
      // The LOOK target snaps onto the bird faster than the position eases in, so the firebird stays
      // centred through the hand-off — otherwise the camera swings while the bird isn't yet centred
      // and it flicks off the right edge (~0.875) before the orbit settles. The lookRef smoothing
      // below keeps this fast look-on smooth (no hard snap).
      const eLook = smoothstep(clamp01((p - FINALE.from) / (FINALE.trackIn * 0.4)));
      // orbit 0→1 completes by FINALE.orbitTo, then holds at 1 (front) so the camera settles
      // head-on. segmentEase (mild), NOT smoothstep: the audit measured smoothstep compressing
      // the whole 360° into the middle of the window (peak 85°/0.01p vs the 28° mean) — the
      // finale whip. The mild ease spreads the spin almost evenly and still lands the same
      // front view at orbitTo.
      const prog = segmentEase(
        clamp01(
          (p - (FINALE.from + FINALE.spinDelay)) /
            (FINALE.orbitTo - FINALE.from - FINALE.spinDelay)
        )
      );
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
      _look.lerp(_olook, eLook);
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
