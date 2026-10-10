// Where each prop rests on the uneven ledge: the highest point of the rock under each (x, z) spot. One pass over the
// ledge's triangles answers every spot at once. Pure typed-array math with no three.js, so it runs in the worker.
// Each mesh: { array, stride, offset, count, normalized, index, matrix } with the position array as exported and the
// mesh's world matrix as 16 column-major numbers. meshopt stores positions as normalized 16-bit integers, interleaved
// four to a vertex (x, y, z, padding), so `stride` is the step between vertices, not 3.
export function ledgeHeights(meshes, spots) {
  const best = spots.map(() => -Infinity);
  for (const { array, stride, offset, count, normalized, index, matrix } of meshes) {
    const scale = normalized ? 1 / (array instanceof Int16Array ? 32767 : array instanceof Int8Array ? 127 : array instanceof Uint16Array ? 65535 : 1) : 1;
    const m = matrix;
    const w = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const k = i * stride + offset;
      const x = array[k] * scale, y = array[k + 1] * scale, z = array[k + 2] * scale;
      w[i * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
      w[i * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      w[i * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    const n = index ? index.length : count;
    for (let t = 0; t < n; t += 3) {
      const a = (index ? index[t] : t) * 3, b = (index ? index[t + 1] : t + 1) * 3, c = (index ? index[t + 2] : t + 2) * 3;
      const ax = w[a], az = w[a + 2], bx = w[b], bz = w[b + 2], cx = w[c], cz = w[c + 2];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (d === 0) continue;
      for (let s = 0; s < spots.length; s++) {
        const [x, z] = spots[s];
        const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
        const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
        const l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        const y = l1 * w[a + 1] + l2 * w[b + 1] + l3 * w[c + 1];
        if (y > best[s]) best[s] = y;                      // the top surface, as a downward ray would hit first
      }
    }
  }
  return best;
}
