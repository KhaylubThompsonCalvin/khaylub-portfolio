import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { SHOTS } from '../data/camera.js';

// System 3 — Camera. Phase 3: keyframed shots interpolated by scrollProgress, so the
// camera moves around the in-place Wanderer and the journey reads as composition.
// scrollProgress (Lenis -> store) is the single scroll authority; this just samples it.

const FOLLOW = 3.0; // settle smoothing (higher = snappier)
const smoothstep = (t) => t * t * (3 - 2 * t);

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _b = new THREE.Vector3();

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

  useFrame((state, dt) => {
    const p = useExperience.getState().scrollProgress;
    sample(p, _pos, _look);

    // gentle breathing drift for life (skip for reduced motion)
    if (!reducedMotion) {
      const t = state.clock.elapsedTime;
      _pos.x += Math.sin(t * 0.5) * 0.04;
      _pos.y += Math.sin(t * 0.37) * 0.03;
    }

    const k = 1 - Math.exp(-FOLLOW * dt);
    camera.position.lerp(_pos, k);
    lookRef.current.lerp(_look, k);
    camera.lookAt(lookRef.current);
  });

  return null;
}
