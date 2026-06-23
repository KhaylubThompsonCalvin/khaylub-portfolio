import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { BLOOM_LAYER } from './SelectiveBloom.jsx';
import { FINALE_REVEAL } from '../data/phoenix.js';

// FinaleReveal — "the spark becomes fire" (built into the freeze the stub reserved).
//
// As the phoenix slow-flaps to its held pose at the summit (PhoenixFlap freeze 0.93→1.0), a soft
// white-gold BLOOM flares from it and a ring of EMBERS bursts outward; then it SETTLES into a calm,
// held glowing final frame — the emotional resolve of the climb. The bird is NOT touched (the
// locked rising-phoenix ascent stands); this only blooms the light AROUND it, spawned from the live
// store.phoenixPos. Same idioms as Feathers: canvas glow sprites on the BLOOM_LAYER, additive +
// toneMapped off, deterministic seeds (no per-frame alloc), scrollProgress via getState() in
// useFrame (ADR-001). The bloom envelope is scroll-anchored so it honours reduced motion; only the
// gentle held breath/bob/twinkle is autonomous and is dropped when reduced.

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Soft radial glow sprite — warm core fading to a transparent edge. `core`/`mid` tune the look so
// the one maker serves both the big white-gold flare and the smaller gold embers.
function makeGlowTexture(core, mid) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 1, 64, 64, 62);
  g.addColorStop(0, core);
  g.addColorStop(0.4, mid);
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function FinaleReveal() {
  const reducedMotion = useExperience((s) => s.reducedMotion);

  const flareTex = useMemo(
    () => makeGlowTexture('rgba(255,248,235,1)', 'rgba(255,210,140,0.5)'),
    []
  );
  const emberTex = useMemo(
    () => makeGlowTexture('rgba(255,236,200,1)', 'rgba(255,180,90,0.5)'),
    []
  );
  const flareColor = useMemo(() => new THREE.Color(FINALE_REVEAL.flareColor), []);
  const emberColor = useMemo(() => new THREE.Color(FINALE_REVEAL.emberColor), []);

  const flare = useRef();
  const flareMat = useRef();
  const embers = useRef();
  const settle = useRef(0); // 0 at the crest → 1 once held; eases the flare peak down to its hold

  // Deterministic ember directions — a golden-angle spiral biased UP so the burst rises like sparks
  // rather than spraying down. Seeded by index, so no Math.random in the frame loop.
  const seeds = useMemo(
    () =>
      Array.from({ length: FINALE_REVEAL.emberCount }, (_, i) => {
        const golden = i * 2.39996;
        const y = 0.15 + 0.85 * ((i + 0.5) / FINALE_REVEAL.emberCount); // upward bias
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        return {
          dir: new THREE.Vector3(Math.cos(golden) * r, y, Math.sin(golden) * r),
          reach: 0.55 + ((i * 0.37) % 1) * 0.45, // each travels a slightly different distance
          phase: (i * 1.7) % (Math.PI * 2),
          twinkle: 0.7 + ((i * 0.53) % 1) * 0.6,
        };
      }),
    []
  );

  useEffect(() => {
    flare.current?.layers.enable(BLOOM_LAYER);
    embers.current?.children.forEach((m) => m.layers.enable(BLOOM_LAYER));
  }, []);

  useFrame((state, dt) => {
    const g = flare.current;
    const grp = embers.current;
    if (!g || !grp) return;
    const store = useExperience.getState();
    const p = store.scrollProgress;

    // Scroll-anchored envelope: 0 before the freeze, ramping to 1 at the very end.
    const env = smoothstep(
      clamp01((p - FINALE_REVEAL.from) / (FINALE_REVEAL.full - FINALE_REVEAL.from))
    );
    if (env < 0.001) {
      g.visible = false;
      for (const m of grp.children) m.visible = false;
      settle.current = 0;
      return;
    }

    const ph = store.phoenixPos;
    const t = state.clock.elapsedTime;
    const out = easeOut(env);
    const breath = reducedMotion ? 0 : Math.sin(t * 1.1) * FINALE_REVEAL.breath;
    // Moving the cursor fans the bloom brighter — the finale reacts to you (reduced motion → 0).
    const ptr = reducedMotion ? 0 : Math.min(1, Math.hypot(store.pointerX, store.pointerY));

    // Once bloomed, ease the flare from its peak down to a steadier hold over ~1.2s (scroll is
    // pinned at 1.0 while you rest, so the "settle" is time-based); wind back if you scroll up.
    if (env > 0.995) settle.current = Math.min(1, settle.current + dt / 1.2);
    else settle.current = Math.max(0, settle.current - dt / 0.6);
    const flareLevel = THREE.MathUtils.lerp(
      FINALE_REVEAL.flarePeak,
      FINALE_REVEAL.flareHold,
      settle.current
    );

    // Central white-gold flare, billboarded so it always reads as a flat disc of light.
    g.visible = true;
    g.position.set(ph.x, ph.y, ph.z);
    g.quaternion.copy(state.camera.quaternion);
    g.scale.setScalar(FINALE_REVEAL.flareSize * (0.5 + 0.5 * out));
    flareMat.current.opacity = clamp01(env * (flareLevel + breath + 0.3 * ptr));

    // Ember burst: each ember eases outward along its seeded direction to burstRadius*reach with
    // extra upward buoyancy, then hovers (bob) and twinkles at the held frame so the summit stays
    // alive. Billboarded like the flare.
    for (let i = 0; i < grp.children.length; i++) {
      const m = grp.children[i];
      const s = seeds[i];
      const dist = FINALE_REVEAL.burstRadius * s.reach * out;
      const bob = reducedMotion ? 0 : Math.sin(t * 0.5 + s.phase) * FINALE_REVEAL.bob;
      m.visible = true;
      m.position.set(
        ph.x + s.dir.x * dist,
        ph.y + s.dir.y * dist + FINALE_REVEAL.rise * out + bob,
        ph.z + s.dir.z * dist
      );
      m.quaternion.copy(state.camera.quaternion);
      m.scale.setScalar(FINALE_REVEAL.emberSize);
      const twk = reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(t * s.twinkle + s.phase);
      m.material.opacity = clamp01(env * (0.85 - 0.25 * out) * twk + 0.18 * ptr * env);
    }
  });

  return (
    <group>
      <mesh ref={flare} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={flareMat}
          map={flareTex}
          color={flareColor}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          opacity={0}
        />
      </mesh>
      <group ref={embers}>
        {seeds.map((_, i) => (
          <mesh key={i} visible={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={emberTex}
              color={emberColor}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
              opacity={0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
