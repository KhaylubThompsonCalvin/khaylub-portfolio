import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { BLOOM_LAYER } from './SelectiveBloom.jsx';
import { TRAIL } from '../data/phoenix.js';

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);

// Soft round ember sprite — warm core fading to transparent, so additive + bloom turn it into a
// drifting spark of light (same maker idea as Feathers/FinaleReveal).
function makeEmberTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,238,200,1)');
  g.addColorStop(0.4, 'rgba(255,165,80,0.6)');
  g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// EmberTrail — glowing sparks shed behind the firebird along its flight, drawing the arc of the
// overhead sweep + climb in light. Keeps a short time-throttled history of the bird's LIVE position
// (store.phoenixPos, which already carries the summit pointer offset), placing pool sprites at
// recent points and fading/shrinking them toward the tail. Same idioms as Feathers: bloom-layer
// canvas sprites, additive + toneMapped off, scrollProgress via getState() in useFrame (ADR-001),
// reduced-motion gated. Preallocated history vectors — no per-frame allocation.
export default function EmberTrail() {
  const group = useRef();
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const tex = useMemo(() => makeEmberTexture(), []);
  const color = useMemo(() => new THREE.Color(TRAIL.color), []);

  // ring of recent positions, newest at index 0 (preallocated; shifted in place)
  const hist = useMemo(() => Array.from({ length: TRAIL.count }, () => new THREE.Vector3()), []);
  const filled = useRef(0); // how many history slots are valid yet
  const acc = useRef(0); // throttle accumulator

  useEffect(() => {
    group.current?.children.forEach((m) => m.layers.enable(BLOOM_LAYER));
  }, []);

  useFrame((state, dt) => {
    const grp = group.current;
    if (!grp) return;
    const store = useExperience.getState();
    const p = store.scrollProgress;
    const env = smoothstep(clamp01((p - TRAIL.from) / TRAIL.fadeSpan));
    if (env < 0.01 || reducedMotion) {
      for (const m of grp.children) m.visible = false;
      filled.current = 0;
      acc.current = 0;
      return;
    }

    const ph = store.phoenixPos;
    // Advance the throttled history: shift everything one slot toward the tail, insert the live head.
    acc.current += dt;
    if (acc.current >= TRAIL.sampleDt || filled.current === 0) {
      acc.current = 0;
      for (let i = hist.length - 1; i > 0; i--) hist[i].copy(hist[i - 1]);
      hist[0].set(ph.x, ph.y, ph.z);
      filled.current = Math.min(hist.length, filled.current + 1);
    }

    // Place sprites along the history — head bright/large, tail faint/small. Billboarded to camera.
    const denom = hist.length - 1 || 1;
    for (let i = 0; i < grp.children.length; i++) {
      const m = grp.children[i];
      if (i >= filled.current) {
        m.visible = false;
        continue;
      }
      const age = i / denom; // 0 = head (at the bird), 1 = tail
      m.visible = true;
      m.position.copy(hist[i]);
      m.quaternion.copy(state.camera.quaternion);
      m.scale.setScalar(TRAIL.size * (1 - 0.7 * age));
      m.material.opacity = env * TRAIL.baseOpacity * (1 - age) * (1 - age);
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: TRAIL.count }).map((_, i) => (
        <mesh key={i} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            color={color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}
