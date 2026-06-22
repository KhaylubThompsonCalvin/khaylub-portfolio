import { useMemo } from 'react';
import * as THREE from 'three';

// Grounding slope — gives the Wanderer a surface so he reads as standing on the trail, not
// floating in cream. A wide plane that rises gently toward +X (the summit he faces) and falls
// toward −X (the valley behind), with low-frequency undulation so it reads as terrain, not a
// ramp. Fog is left ON (default), so beyond ~26 m it dissolves into whatever colour the sky
// currently is (Atmosphere drives both) — no hard horizon edge, and the ground re-tints itself
// dawn→alpine→summit for free. A soft painted shadow plants his feet (cheaper and more
// predictable than real shadow maps, which would also fight the bloom render takeover).
export default function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(80, 80, 96, 96);
    g.rotateX(-Math.PI / 2); // lay flat on XZ, +Y up
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // rise toward +X (uphill ahead) / fall toward −X; sin terms are 0 at the origin so his
      // feet (world y≈0) stay planted, and add gentle rolling relief away from him.
      const slope = x * 0.06;
      const relief = Math.sin(x * 0.25) * 0.12 + Math.sin(z * 0.2) * 0.1;
      pos.setY(i, slope + relief);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const shadowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(38,28,16,0.5)');
    grad.addColorStop(0.55, 'rgba(38,28,16,0.18)');
    grad.addColorStop(1, 'rgba(38,28,16,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group>
      <mesh geometry={geo} position={[0, -0.02, 0]}>
        <meshStandardMaterial color="#d8cbb6" roughness={0.95} metalness={0} />
      </mesh>
      {/* soft contact shadow under his stance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.05]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
