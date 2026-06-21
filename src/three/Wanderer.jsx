import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';

const MODEL = '/assets/models/wanderer-web.glb';
useGLTF.preload(MODEL);

// --- walk-scrub tuning ---
const WALK_END = 0.66; // scroll fraction by which he has arrived and stops
const CYCLES = 6; // stride cycles taken across the journey

// System 1 — Hero Character. Uses drei's useAnimations binding (correct pose), but the
// walk is PAUSED and we set action.time from scrollProgress each frame — so scroll
// drives his stride and he comes to rest at the work. Phase 3 keyframes the camera.
export default function Wanderer(props) {
  const group = useRef();
  const { scene, animations } = useGLTF(MODEL);
  const { actions, names } = useAnimations(animations, group);
  const setReady = useExperience((s) => s.setReady);
  const walkRef = useRef(null);
  const durRef = useRef(1);
  const bonesRef = useRef({});

  useEffect(() => {
    console.log('%c[Wanderer] GLB animation clips:', 'color:#caa46f', names);
    if (import.meta.env.DEV) {
      // Self-check the export scale (he should stand ~1.0 m). Mirrors the Phoenix readout so the
      // two can be sized against each other in the scene.
      const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      console.log('%c[Wanderer] rendered bbox @scale 1 (units≈m):', 'color:#caa46f', {
        x: +size.x.toFixed(3),
        y: +size.y.toFixed(3),
        z: +size.z.toFixed(3),
      });
    }
    const b = {};
    scene.traverse((o) => {
      if (o.isBone && o.name === 'Root') b.Root = o;
    });
    bonesRef.current = b;
    const walkName = names.find((n) => /walk/i.test(n)) || names[0];
    const action = walkName && actions[walkName];
    if (action) {
      action.reset();
      action.play();
      action.paused = true; // we drive .time manually; the mixer still applies the pose
      walkRef.current = action;
      durRef.current = action.getClip().duration;
    }
    setReady(true);
  }, [scene, actions, names, setReady]);

  // scrub: scrollProgress -> action.time (manual modulo loop, clamped after WALK_END)
  useFrame(() => {
    const action = walkRef.current;
    if (!action) return;

    // lock forward/lateral drift so he walks IN PLACE (treadmill). He is the constant
    // anchor; the world moves past him in Phase 3. Keeps leg cycle + vertical bob.
    const root = bonesRef.current.Root;
    if (root) {
      root.position.x = 0;
      root.position.z = 0;
    }

    const p = useExperience.getState().scrollProgress;
    const walkT = Math.min(1, Math.max(0, p / WALK_END));
    const dur = durRef.current;
    action.time = (walkT * CYCLES * dur) % dur;
  });

  return <primitive ref={group} object={scene} {...props} />;
}
