// dequantize(root): turns every quantized vertex attribute under root (meshopt / KHR_mesh_quantization: 8 and 16 bit
// integers, normalized or not, interleaved or not) into plain Float32 attributes, morph targets included. Returns root.
// Why: WebGL on Direct3D (ANGLE) builds a separate vertex shader for integer inputs at an object's FIRST DRAW, after any
// compile / compileAsync warm-up, so a quantized model froze the frame it first appeared (50 to 70 ms for the phoenix,
// measured 2026-10-09). As floats it draws with the program the warm-up already built. Cost: more GPU memory (a 25,000
// vertex skinned model grows by under 2 MB). The values are what three reads anyway (getComponent denormalizes), so
// the model looks exactly the same; node transforms (the quantization scale) are untouched.
import * as THREE from 'three';

function toFloat(a) {
  if (a.array instanceof Float32Array && !a.isInterleavedBufferAttribute) return a;
  const f = new Float32Array(a.count * a.itemSize);
  for (let v = 0; v < a.count; v++) for (let c = 0; c < a.itemSize; c++) f[v * a.itemSize + c] = a.getComponent(v, c);
  return new THREE.BufferAttribute(f, a.itemSize);
}

export function dequantize(root) {
  root.traverse((o) => {
    const g = o.geometry;
    if (!g) return;
    for (const [k, a] of Object.entries(g.attributes)) { const f = toFloat(a); if (f !== a) g.setAttribute(k, f); }
    for (const list of Object.values(g.morphAttributes || {})) for (let i = 0; i < list.length; i++) list[i] = toFloat(list[i]);
  });
  return root;
}
