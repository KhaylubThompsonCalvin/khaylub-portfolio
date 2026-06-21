import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Wanderer from './Wanderer.jsx';
import PhoenixFlap from './PhoenixFlap.jsx';
import CameraRig from './CameraRig.jsx';
import Atmosphere from './Atmosphere.jsx';
import Ground from './Ground.jsx';
import SelectiveBloom from './SelectiveBloom.jsx';
import { BLOOM } from '../data/phoenix.js';

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

      {/* Tonal sky (dawn→alpine→summit) — drives scene background + fog colour from scroll.
          Outside Suspense so it runs even while the GLBs load. */}
      <Atmosphere />

      <Suspense fallback={null}>
        {/* Grounding slope so he stands on the trail, fog-blended into the tonal sky. */}
        <Ground />
        <Wanderer position={[0, 0, 0]} />
        {/* "Spark of the Summit": a secondary phoenix accent — dormant until ~0.50, then an
            ember rises through the far background behind the Wanderer and ignites to fire by
            the summit. Flight + emission are scroll-driven inside PhoenixFlap (choreography in
            data/phoenix.js); no transform props here. */}
        <PhoenixFlap />
      </Suspense>

      <CameraRig />
      {/* Selective bloom so only the phoenix's ember/fire feathers glow (the light cream
          background must never bloom). Takes over the render loop — keep it last in the tree. */}
      <SelectiveBloom strength={BLOOM.strength} radius={BLOOM.radius} threshold={BLOOM.threshold} />
    </Canvas>
  );
}
