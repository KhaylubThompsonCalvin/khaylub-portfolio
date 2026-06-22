import { useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { SKY } from '../data/palette.js';

// Atmosphere — the tonal color progression. Samples the SKY palette by scrollProgress and writes
// the scene background + fog colour each frame, so the world warms (dawn) → cools (alpine) →
// clears (summit) as you climb. Reads scroll via getState() in useFrame (the ADR-001 idiom — no
// per-frame React re-render). The grounding terrain (three/Ground.jsx) shares the fog, so its
// horizon dissolves into whatever colour the sky currently is — they move together.
//
// (Phase 4 will add Higgsfield plates — starfield / god-rays — as background planes behind the
// Wanderer; this colour drive is the cheap-but-high-impact first layer of that atmosphere.)
export default function Atmosphere() {
  const { scene } = useThree();

  const stops = useMemo(() => SKY.map((s) => ({ at: s.at, c: new THREE.Color(s.color) })), []);
  const scratch = useMemo(() => new THREE.Color(), []);
  // Finale dusk — the sky falls to deep twilight across 0.94→1.0 so the white-fire phoenix and the
  // sun blaze against it during the close-up orbit (the dark backdrop the bird has always needed).
  const dusk = useMemo(() => new THREE.Color('#0d1322'), []);

  useFrame(() => {
    const p = useExperience.getState().scrollProgress;

    let i = 0;
    while (i < stops.length - 1 && p > stops[i + 1].at) i++;
    const a = stops[i];
    const b = stops[Math.min(i + 1, stops.length - 1)];
    const t = a.at === b.at ? 0 : Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at)));
    scratch.copy(a.c).lerp(b.c, t);

    if (p > 0.94) {
      const d = Math.min(1, (p - 0.94) / 0.06);
      scratch.lerp(dusk, d * d * (3 - 2 * d));
    }

    if (scene.background?.isColor) scene.background.copy(scratch);
    if (scene.fog) scene.fog.color.copy(scratch);
  });

  return null;
}
