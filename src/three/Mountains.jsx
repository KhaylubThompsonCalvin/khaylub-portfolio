import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';

const clamp01 = (t) => Math.min(1, Math.max(0, t));

// A natural-looking ridgeline 0..1 from layered sines (cheap, deterministic, no per-frame work).
function ridgeline(t, seed) {
  return (
    (Math.sin(t * 0.7 + seed) * 0.55 +
      Math.sin(t * 1.7 + seed * 1.3) * 0.28 +
      Math.sin(t * 3.9 + seed * 2.1) * 0.13 +
      Math.sin(t * 8.3 + seed) * 0.05) *
      0.5 +
    0.5
  );
}

// One distant ridge as a tall wall whose TOP edge is jagged peaks and bottom drops below the
// horizon. Built once; oriented to face +X (the camera sits on the +X side looking back through
// the summit), so its width spans world Z.
function makeRidgeGeo(width, height, segs, peakAmp, seed) {
  const g = new THREE.PlaneGeometry(width, height, segs, 1);
  const pos = g.attributes.position;
  const half = height / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (pos.getY(i) > 0) pos.setY(i, half + ridgeline(x * 0.06, seed) * peakAmp); // jagged crest
    else pos.setY(i, -half); // flat base, sits below the horizon
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// Layered distant mountains behind the summit — real geometry (not a flat plate), so the ranges
// PARALLAX against each other and the sky as the camera cranes/tilts at the top: the vista of "more
// mountains" opens up with depth as the Wanderer crests. Unlit + fog-exempt (they sit far past the
// scene fog) with hand-tuned atmospheric tint — nearer ranges darker/cooler, far ranges hazing into
// the sky. Revealed by scroll (~0.70→0.88) so they rise into view on the approach, then hold.
const LAYERS = [
  { dist: 46, width: 150, height: 30, peakAmp: 12, segs: 120, color: '#73869e', maxOp: 0.92, seed: 0.4, y: 1 },
  { dist: 78, width: 220, height: 38, peakAmp: 17, segs: 150, color: '#93a6bd', maxOp: 0.85, seed: 2.3, y: 2 },
  { dist: 118, width: 320, height: 50, peakAmp: 24, segs: 180, color: '#c0ccdb', maxOp: 0.78, seed: 4.9, y: 3 },
];

export default function Mountains() {
  const mats = useRef([]);
  const geos = useMemo(() => LAYERS.map((L) => makeRidgeGeo(L.width, L.height, L.segs, L.peakAmp, L.seed)), []);

  useFrame(() => {
    const p = useExperience.getState().scrollProgress;
    const reveal = clamp01((p - 0.7) / 0.18); // rise into view on the summit approach, then hold
    for (let i = 0; i < mats.current.length; i++) {
      const m = mats.current[i];
      if (m) m.opacity = reveal * LAYERS[i].maxOp;
    }
  });

  return (
    <group>
      {LAYERS.map((L, i) => (
        <mesh key={i} geometry={geos[i]} position={[-L.dist, L.y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <meshBasicMaterial
            ref={(el) => (mats.current[i] = el)}
            color={L.color}
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
