import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { BLOOM_LAYER } from './SelectiveBloom.jsx';
import { FEATHERS } from '../data/phoenix.js';

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);

// A soft, elongated glowing-feather sprite (canvas) — warm core fading to a transparent edge, so
// additive blending + the bloom pass turn it into a drifting ember of light.
function makeFeatherTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 64, 1, 32, 64, 44);
  g.addColorStop(0, 'rgba(255,244,222,1)');
  g.addColorStop(0.45, 'rgba(255,190,110,0.75)');
  g.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(32, 64, 13, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Glowing feathers that fall slowly from the phoenix at the summit. The fall is TIME-based (not
// scroll-locked) so they keep drifting while you rest at the summit; each spawns from the live
// phoenixPos, sways and spins as it sinks, then recycles back up to the bird. On the bloom layer so
// it glows. Gated by reduced motion (no autonomous drift). Reads scroll via getState() (ADR-001).
export default function Feathers() {
  const group = useRef();
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const tex = useMemo(() => makeFeatherTexture(), []);
  const color = useMemo(() => new THREE.Color(FEATHERS.color), []);

  // Per-feather drift state — deterministic offsets (no Math.random in the frame loop), seeded by
  // index so each feather falls on its own phase/spread without per-frame allocation.
  const seeds = useMemo(
    () =>
      Array.from({ length: FEATHERS.count }, (_, i) => {
        const a = i * 2.39996; // golden-angle spread around the bird
        return {
          ang: a,
          radius: FEATHERS.spread * (0.35 + 0.65 * ((i * 0.6180339) % 1)),
          phase: (i * 1.7) % (Math.PI * 2),
          speed: 0.8 + ((i * 0.37) % 1) * 0.5,
          life: (i / FEATHERS.count) * FEATHERS.drop, // staggered so they don't fall in lockstep
        };
      }),
    []
  );

  return (
    <group ref={group}>
      {seeds.map((s, i) => (
        <Feather key={i} seed={s} tex={tex} color={color} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function Feather({ seed, tex, color, reducedMotion }) {
  const mesh = useRef();
  const mat = useRef();
  const fallen = useRef(seed.life);

  // Opt into selective bloom so the feather glows (same pattern as the phoenix's emissive feathers).
  useEffect(() => {
    mesh.current?.layers.enable(BLOOM_LAYER);
  }, []);

  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    const store = useExperience.getState();
    const p = store.scrollProgress;
    const env = smoothstep(clamp01((p - FEATHERS.from) / FEATHERS.fadeSpan));
    if (env < 0.01 || reducedMotion) {
      m.visible = false;
      return;
    }
    m.visible = true;

    // Advance the fall over time, recycling back up to the bird once it has dropped `drop` metres.
    fallen.current += FEATHERS.fall * seed.speed * dt;
    if (fallen.current > FEATHERS.drop) fallen.current -= FEATHERS.drop;

    const ph = store.phoenixPos;
    const t = state.clock.elapsedTime;
    const sway = Math.sin(t * 0.6 + seed.phase) * FEATHERS.sway;
    m.position.set(
      ph.x + Math.cos(seed.ang) * seed.radius + sway,
      ph.y - fallen.current,
      ph.z + Math.sin(seed.ang) * seed.radius + Math.cos(t * 0.5 + seed.phase) * FEATHERS.sway * 0.5
    );
    m.rotation.z = t * FEATHERS.spin + seed.phase;
    m.scale.setScalar(FEATHERS.size);
    // Fade in at spawn (top) and out near the bottom of the drop so recycling is invisible.
    const lifeFade = smoothstep(clamp01(fallen.current / 0.8)) * (1 - smoothstep(clamp01((fallen.current - (FEATHERS.drop - 1.2)) / 1.2)));
    mat.current.opacity = env * lifeFade;
  });

  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        color={color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        opacity={0}
      />
    </mesh>
  );
}
