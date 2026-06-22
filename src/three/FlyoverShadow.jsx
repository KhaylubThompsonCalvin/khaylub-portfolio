import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { SHADOW } from '../data/phoenix.js';
import { groundHeight, makeContactShadowTexture } from './Ground.jsx';

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Smooth 0->1->0 bump over [a,b] peaking at `peak` — the overhead-pass envelope.
function bump(p, a, peak, b) {
  if (p <= a || p >= b) return 0;
  const t = p < peak ? (p - a) / (peak - a) : (b - p) / (b - peak);
  return smoothstep(clamp01(t));
}

// The firebird's shadow sweeping over the Wanderer during the overhead pass (~0.50→0.62). A soft
// projected pool, not a real shadow map (Ground.jsx explains why). It tracks the bird's published
// ground position (store.phoenixPos, mutated each frame by PhoenixFlap) and sits on the same trail
// surface as the geometry. Scroll-driven via getState() — no per-frame React re-render. Gated to
// the pass window so it's invisible once the bird has climbed away.
export default function FlyoverShadow() {
  const mesh = useRef();
  const mat = useRef();
  const tex = useMemo(() => makeContactShadowTexture(), []);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const store = useExperience.getState();
    const env = bump(store.scrollProgress, SHADOW.from, SHADOW.peak, SHADOW.to);
    if (env < 0.01) {
      m.visible = false;
      return;
    }
    const { x, y, z } = store.phoenixPos;
    m.visible = true;
    // Straight-down projection onto the trail surface, lifted a hair to avoid z-fighting.
    m.position.set(x, groundHeight(x, z) + 0.015, z);
    // A higher bird casts a larger, fainter pool.
    const h = Math.max(0, y);
    const size = SHADOW.baseSize + h * SHADOW.sizePerHeight;
    m.scale.set(size, size, 1);
    const heightFade = lerp(1, SHADOW.highFade, clamp01(h / SHADOW.softnessHeight));
    mat.current.opacity = env * SHADOW.maxOpacity * heightFade;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        transparent
        depthWrite={false}
        toneMapped={false}
        opacity={0}
      />
    </mesh>
  );
}
