// Distant peaks that rise out of the cloud sea: ridged noise on a radial falloff, rock below, snow on the high, flat faces.
import * as THREE from 'three';
import { peakGeometry } from './peakGeometry.js';
import { runInWorker } from './worker.js';

function peakMesh(geo) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'Peak';
  return m;
}

// The noise for a peak costs 30 to 60 ms of main-thread time, paid again on every page arrival, so peaks are built
// in the worker while the page keeps drawing. Without workers they are built here, as before.
export function createPeak(opts) {
  return runInWorker('peak', { opts }).then((data) => {
    if (!data) return peakMesh(peakGeometry(opts));              // no worker, or it failed: build it here
    const geo = new THREE.BufferGeometry();
    for (const [name, arr, size] of data.attributes) geo.setAttribute(name, new THREE.BufferAttribute(arr, size));
    geo.setIndex(new THREE.BufferAttribute(data.index, 1));
    geo.computeBoundingSphere();
    return peakMesh(geo);
  });
}

export async function createRange({ palette }) {
  const g = new THREE.Group();
  g.name = 'Range';
  const spots = [
    // x, z, radius, height, seed  (the camera looks toward -Z; the sun sits low behind the far left peaks)
    [-520, -900, 300, 260, 1], [-120, -1150, 360, 330, 2], [380, -980, 280, 240, 3],
    [820, -760, 240, 190, 4], [-900, -620, 220, 170, 5], [120, -620, 160, 110, 6],
  ];
  const peaks = await Promise.all(spots.map(([, , r, h, s]) => createPeak({ radius: r, height: h, seed: s, palette })));
  peaks.forEach((p, i) => { p.position.set(spots[i][0], 0, spots[i][1]); g.add(p); });
  return g;
}
