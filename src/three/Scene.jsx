import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Wanderer from './Wanderer.jsx';
import PhoenixFlap from './PhoenixFlap.jsx';
import CameraRig from './CameraRig.jsx';
import Atmosphere from './Atmosphere.jsx';
import Ground from './Ground.jsx';
import Mountains from './Mountains.jsx';
import SummitBackdrop from './SummitBackdrop.jsx';
import FlyoverShadow from './FlyoverShadow.jsx';
import ForeshadowShadow from './ForeshadowShadow.jsx';
import Feathers from './Feathers.jsx';
import Sun from './Sun.jsx';
import FinaleReveal from './FinaleReveal.jsx';
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

      {/* Lifted so the Wanderer and firebird read clearly through the scene (was too dark):
          more ambient fill to open the shadows, a brighter dawn key + sky. */}
      <hemisphereLight args={['#f7eede', '#c4ad8c', 1.6]} />
      <directionalLight position={[3, 6, 4]} intensity={2.9} color="#fff3e2" castShadow />
      <ambientLight intensity={0.6} />

      {/* Tonal sky (dawn→alpine→summit) — drives scene background + fog colour from scroll.
          Outside Suspense so it runs even while the GLBs load. */}
      <Atmosphere />

      <Suspense fallback={null}>
        {/* Grounding slope so he stands on the trail, fog-blended into the tonal sky. */}
        <Ground />
        {/* Far mountain vista (matte plate) + nearer procedural ranges in front of it — together
            they open a vista with depth as he crests the summit. */}
        <SummitBackdrop />
        <Mountains />
        {/* The firebird's shadow sweeping over him during the overhead pass (~0.50→0.62);
            follows store.phoenixPos, gated to the pass window. */}
        <FlyoverShadow />
        <Wanderer position={[0, 0, 0]} />
        {/* Philosophy foreshadow: the unseen phoenix felt as a shadow sweeping down his back. */}
        <ForeshadowShadow />
        {/* "Spark of the Summit": a secondary phoenix accent — dormant until ~0.50, then an
            ember rises through the far background behind the Wanderer and ignites to fire by
            the summit. Flight + emission are scroll-driven inside PhoenixFlap (choreography in
            data/phoenix.js); no transform props here. */}
        <PhoenixFlap />
        {/* Glowing feathers drifting down from the phoenix at the summit. */}
        <Feathers />
        {/* The summit sun the firebird flies into — ignites across the final approach. */}
        <Sun />
        {/* Prep mount for the freeze-pose climax ("something amazing") — null stub for now. */}
        <FinaleReveal />
      </Suspense>

      <CameraRig />
      {/* Selective bloom so only the phoenix's ember/fire feathers glow (the light cream
          background must never bloom). Takes over the render loop — keep it last in the tree. */}
      <SelectiveBloom strength={BLOOM.strength} radius={BLOOM.radius} threshold={BLOOM.threshold} />
    </Canvas>
  );
}
