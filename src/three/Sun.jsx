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
const SUN_POS = [-16, 4.5, -1];

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
    // Ignites across the final approach and stays bright through the summit — the warm disc the
    // firebird flies into, against the sunny blue sky.
    const e = smoothstep(clamp01((p - 0.8) / 0.14));
    if (e < 0.01) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.scale.setScalar(1 + e * 1.6);
    // Kept modest so it backlights the firebird (which the phoenix flies into) rather than
    // blooming over it — the phoenix is the hero and must read against the sun, not drown in it.
    if (mat.current) mat.current.emissiveIntensity = 0.8 + e * 1.7;
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
