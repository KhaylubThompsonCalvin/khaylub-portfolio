import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useExperience } from '../store/useExperience.js';
import { FORESHADOW } from '../data/phoenix.js';
import { groundHeight, makeContactShadowTexture } from './Ground.jsx';

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Smooth 0->1->0 bump over [a,b] peaking at `peak`.
function bump(p, a, peak, b) {
  if (p <= a || p >= b) return 0;
  const t = p < peak ? (p - a) / (peak - a) : (b - p) / (b - peak);
  return smoothstep(clamp01(t));
}

// The philosophy foreshadow: the phoenix is UNSEEN here — you feel it as a soft shadow sweeping
// across the lit grass, over the Wanderer and on past, as if something just crested overhead (the
// spark felt before it's seen). A flat ground pool swept by scroll across the philosophy window;
// it falls on the bright grass where it reads (a shadow on his dark silhouette back wouldn't).
// Scroll-driven via getState() (the ADR-001 idiom); reuses Ground's surface + shadow texture.
export default function ForeshadowShadow() {
  const mesh = useRef();
  const mat = useRef();
  const tex = useMemo(() => makeContactShadowTexture(), []);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const p = useExperience.getState().scrollProgress;
    const env = bump(p, FORESHADOW.from, FORESHADOW.peak, FORESHADOW.to);
    if (env < 0.01) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const u = clamp01((p - FORESHADOW.from) / (FORESHADOW.to - FORESHADOW.from));
    const x = lerp(FORESHADOW.xFrom, FORESHADOW.xTo, u);
    m.position.set(x, groundHeight(x, FORESHADOW.z) + 0.02, FORESHADOW.z);
    m.scale.set(FORESHADOW.size, FORESHADOW.size, 1);
    mat.current.opacity = env * FORESHADOW.maxOpacity;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} map={tex} transparent depthWrite={false} toneMapped={false} opacity={0} />
    </mesh>
  );
}
