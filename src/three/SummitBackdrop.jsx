import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useExperience } from '../store/useExperience.js';

const clamp01 = (t) => Math.min(1, Math.max(0, t));

// The far mountain vista (Higgsfield matte plate) on a large plane deep in the scene — NOT a flat
// DOM overlay, so it parallaxes with the camera behind the procedural ridges (three/Mountains.jsx)
// for true depth as the Wanderer crests. Fog-exempt (far past the scene fog), revealed by scroll on
// the same approach window, then held through the summit.
const SRC = '/assets/images/mountains-vista.png';

export default function SummitBackdrop() {
  const mat = useRef();
  const tex = useTexture(SRC);

  useFrame(() => {
    const p = useExperience.getState().scrollProgress;
    if (mat.current) mat.current.opacity = clamp01((p - 0.68) / 0.18) * 0.95;
  });

  // Sits far in −X and faces +X (the camera's side). Sized large and centred on the gaze so its
  // edges fall well outside the frame (no visible rectangle), with the image's mountain band landing
  // near the scene horizon. Width:height stays ~16:9 to avoid stretch.
  return (
    <mesh position={[-200, 55, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[920, 520]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}
