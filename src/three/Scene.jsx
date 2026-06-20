import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Wanderer from './Wanderer.jsx';
import CameraRig from './CameraRig.jsx';
import Atmosphere from './Atmosphere.jsx';

// The fixed, full-viewport 3D stage. Sits behind the DOM overlays.
export default function Scene() {

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      camera={{ position: [0, 1.8, -3], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#e9e1d6']} />
      <fog attach="fog" args={['#e9e1d6', 7, 26]} />

      <hemisphereLight args={['#f3e8d4', '#b09a7e', 1.1]} />
      <directionalLight position={[3, 6, 4]} intensity={2.1} color="#fff1dc" castShadow />
      <ambientLight intensity={0.25} />

      <Suspense fallback={null}>
        <Wanderer position={[0, 0, 0]} />
        <Atmosphere />
      </Suspense>

      <CameraRig />
    </Canvas>
  );
}
