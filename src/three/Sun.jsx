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
// Placed high + far BEHIND the bird (Kt: "the sun should be above it") so at the finale head-on
// landing it reads as a contained warm disc ABOVE the firebird — the phoenix rising toward the sun —
// while staying far enough back that it doesn't bloom-wash the bird. Tuned live by unprojecting a
// screen point above the bird and pushing it into the background (swept; [-8,18,27] lands the sun
// above with the firebird crisp below). During the orbit it passes in/out of frame, which is fine.
const SUN_POS = [-8, 18, 27];

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
    // DEV: window.__sunPos = [x,y,z] overrides SUN_POS for live tuning of the sun's placement.
    if (import.meta.env.DEV && window.__sunPos) g.position.fromArray(window.__sunPos);
    // A contained disc (not a sky-wide wash) so most of the blue sky stays clean for the firebird.
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
