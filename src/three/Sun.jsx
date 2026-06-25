import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { BLOOM_LAYER } from './SelectiveBloom.jsx';

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);

// The summit sun — a bright emissive sphere far in the sky behind the phoenix's flight, on the
// bloom layer so it blooms into a radiant sun. It rises and ignites across the summit approach so
// the firebird reads as flying INTO it. Scroll-driven via getState() in useFrame (the idiom);
// dormant (hidden) until ~0.8 so it costs nothing earlier. fog is off — it's a light, not terrain.
// Lowered to the horizon (was y4.5) so the disc sits clearly BELOW the firebird's summit flight,
// even through the bird's downward hover drift — it reads against clean blue sky with the sun as a
// contained warm disc beneath, never a wash it flies inside of.
const SUN_POS = [-16, -0.5, -2];

export default function Sun() {
  const group = useRef();
  const mat = useRef();

  // Enable the bloom layer on mount so SelectiveBloom lets the sun glow.
  useEffect(() => {
    group.current?.traverse((o) => o.isMesh && o.layers.enable(BLOOM_LAYER));
  }, []);

  const geo = useMemo(() => new THREE.SphereGeometry(2.2, 40, 40), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = useExperience.getState().scrollProgress;
    // Ignites LATE on the final approach and stays bright through the summit — the warm disc the
    // firebird flies toward. Pushed from 0.80 to 0.84 so it no longer blooms into a white wash that
    // swallows the bird around 0.85; by 1.0 it's still at full brightness for the locked summit.
    const e = smoothstep(clamp01((p - 0.84) / 0.16));
    if (e < 0.01) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // A contained disc (not a sky-wide wash) so most of the blue sky stays clean for the firebird,
    // which now flies against the blue ABOVE it rather than inside it. Kept smaller + dimmer than
    // before so its bloom no longer swallows the bird when the bird drifts across it.
    g.scale.setScalar(1 + e * 0.4);
    if (mat.current) mat.current.emissiveIntensity = 0.6 + e * 1.0;
  });

  return (
    <group ref={group} position={SUN_POS} visible={false}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          ref={mat}
          color="#fff3d8"
          emissive="#ffe2a6"
          emissiveIntensity={1.5}
          roughness={1}
          metalness={0}
          fog={false}
        />
      </mesh>
    </group>
  );
}
