import { useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/useExperience.js';
import { SKY, dayAt } from '../data/palette.js';

// Atmosphere — the night→sunny tonal arc. Samples the SKY palette by scrollProgress for the scene
// background + fog colour, and ramps the scene LIGHTING from a dim night to a bright day (dayAt),
// so the world literally lightens as the Wanderer climbs from the dark trailhead to the sunny
// summit. Reads scroll via getState() in useFrame (the ADR-001 idiom — no per-frame re-render).
// Lights are grabbed from the scene once (Scene.jsx owns the declarations).
// Night floor lifted slightly (was 0.12/0.35/0.5): the Wanderer was reading as near-pure black
// through the pre-dawn focus beat (~0.33–0.42), losing his form. This keeps the night mood while
// letting a rim of him show; the day ramp (dayAt) still opens the shadows fully by sunrise.
const NIGHT = { ambient: 0.18, hemi: 0.5, dir: 0.72 };
const DAY = { ambient: 0.6, hemi: 1.6, dir: 2.9 };
const lerp = (a, b, t) => a + (b - a) * t;

export default function Atmosphere() {
  const { scene } = useThree();
  const stops = useMemo(() => SKY.map((s) => ({ at: s.at, c: new THREE.Color(s.color) })), []);
  const scratch = useMemo(() => new THREE.Color(), []);
  const lights = useRef(null);

  useFrame(() => {
    const p = useExperience.getState().scrollProgress;

    let i = 0;
    while (i < stops.length - 1 && p > stops[i + 1].at) i++;
    const a = stops[i];
    const b = stops[Math.min(i + 1, stops.length - 1)];
    const t = a.at === b.at ? 0 : Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at)));
    scratch.copy(a.c).lerp(b.c, t);
    if (scene.background?.isColor) scene.background.copy(scratch);
    if (scene.fog) scene.fog.color.copy(scratch);

    // Grab the lights once, then ramp them night→day.
    if (!lights.current) {
      const l = {};
      scene.traverse((o) => {
        if (o.isAmbientLight) l.ambient = o;
        else if (o.isHemisphereLight) l.hemi = o;
        else if (o.isDirectionalLight) l.dir = o;
      });
      lights.current = l;
    }
    const day = dayAt(p);
    const l = lights.current;
    if (l.ambient) l.ambient.intensity = lerp(NIGHT.ambient, DAY.ambient, day);
    if (l.hemi) l.hemi.intensity = lerp(NIGHT.hemi, DAY.hemi, day);
    if (l.dir) l.dir.intensity = lerp(NIGHT.dir, DAY.dir, day);
  });

  return null;
}
