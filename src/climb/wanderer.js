// The Wanderer, world-level: one instance the world moves between stages (never one per stage). He walks on the ground a few
// metres ahead of the camera in the direction of travel (-z), only while the camera rests near a stage's anchor. The clip
// Walk_01 has no idle companion, so a rest means finishing the stride on a neutral frame (feet together) and holding it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { dequantize } from '../engine/dequantize.js';

export const HEIGHT = 1.8;          // standing height, metres
export const WALK_SPEED = 1.3;      // ground speed while walking, m/s
const CLIP = 'Walk_01';
const FILL = 0.45;

// ground point under the ray through a normalised-device-coordinate target (x, y in -1..1); the distance along the ground
// is clamped to [minD, maxD] so a camera that looks above the horizon still puts him in front of it. Fills out; returns out.
const ray = new THREE.Raycaster(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
export function groundPoint(camera, ndcX, ndcY, minD, maxD, out) {
  ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  fwd.set(d.x, 0, d.z).normalize();
  let dist = d.y < -1e-4 ? (o.y / -d.y) * Math.hypot(d.x, d.z) : maxD;
  dist = Math.min(maxD, Math.max(minD, dist));
  // horizontal distance along the ray's own heading from the camera, on y = ground (0)
  return out.set(o.x + fwd.x * dist, 0, o.z + fwd.z * dist);
}

export async function loadWanderer(url) {
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const model = dequantize(gltf.scene);   // float attributes: no first-draw shader build on Direct3D (see dequantize.js)
  const clip = gltf.animations.find((a) => a.name === CLIP);
  if (!clip) throw new Error(`Wanderer: clip ${CLIP} missing`);
  model.traverse((o) => { o.frustumCulled = false; });   // skinned bounds are the bind pose; he is tiny, never cull him
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip); action.play();
  const dur = clip.duration;
  const pose = (t, matrices = false) => { action.time = ((t % dur) + dur) % dur; mixer.update(0); if (matrices) model.updateMatrixWorld(true); };   // the render pass updates matrices; only sampling needs them now

  // find the stride's neutral frames (feet level, two per cycle) and its widest frames (mid-stride) by sampling the feet along x (the model's walking axis)
  const lf = model.getObjectByName('L_Foot'), rf = model.getObjectByName('R_Foot');
  const N = 48, sep = [];
  for (let k = 0; k < N; k++) {
    pose((k / N) * dur, true);
    sep.push(lf && rf ? lf.getWorldPosition(tmp).x - rf.getWorldPosition(new THREE.Vector3()).x : 0);
  }
  const neutral = [], wide = [];
  for (let k = 0; k < N; k++) {
    const a = Math.abs(sep[(k + N - 1) % N]), b = Math.abs(sep[k]), c = Math.abs(sep[(k + 1) % N]);
    if (b <= a && b < c) neutral.push((k / N) * dur);
  }
  let widest = 0; for (let k = 1; k < N; k++) if (Math.abs(sep[k]) > Math.abs(sep[widest])) widest = k;
  wide.push((widest / N) * dur);
  if (!neutral.length) neutral.push(0);

  // size: stand 1.8 m tall, feet on y 0, measured on the first neutral frame of the stride
  pose(neutral[0], true);
  const box = new THREE.Box3().setFromObject(model, true);
  const scale = HEIGHT / Math.max(0.01, box.max.y - box.min.y);
  model.scale.setScalar(scale);
  model.position.y = -box.min.y * scale;
  // the world-level fill: a faint emissive lift (his own texture, so he keeps detail) so he is never a pure silhouette, with no
  // light added to the scene (the light count never changes). Its colour follows the light of the hour (setFill, each frame
  // from the blended mood's light colour: cool at night, amber at golden hour); the cool grey is only the start value.
  const mats = [];
  model.traverse((o) => { for (const m of [].concat(o.material || [])) if (m.isMeshStandardMaterial) { m.emissive.set('#9aa3b8'); m.emissiveMap = m.map || null; m.emissiveIntensity = FILL; mats.push(m); } });
  const group = new THREE.Group(); group.name = 'wanderer'; group.visible = false; group.add(model);
  group.rotation.y = Math.PI / 2;   // the model walks along its own +x (the feet swing along x); the journey travels toward -z

  let t = neutral[0], speed = 0, still = false, fade = 1;
  const nextNeutral = () => { let best = Infinity; for (const n of neutral) { const d = ((n - t) % dur + dur) % dur; if (d < best) best = d; } return best; };
  const api = {
    group, height: HEIGHT, duration: dur, neutral, scale, bounds: box,
    get walking() { return speed; },
    // the fill's colour (a THREE.Color, copied, no allocation): the world passes the current mood's light colour
    setFill(c) { for (const m of mats) m.emissive.copy(c); },
    // 0..1: he settles in and out by scale over a short range of lift (opacity would flip the shader's OPAQUE define and
    // recompile every material, a hitch on the first sight)
    setFade(f) { if (f === fade) return; fade = f; group.scale.setScalar(Math.max(0.001, f * f * (3 - 2 * f))); },
    // walk01: 0..1 how hard the visitor is scrolling; returns the fraction of full walking speed (0 at rest)
    update(dt, walk01) {
      if (still) return 0;
      if (walk01 > 0.02) { speed += (walk01 - speed) * (1 - Math.exp(-dt * 6)); t += dt * speed; }
      else {
        // coming to rest: slow into the next neutral frame and hold it
        const left = nextNeutral();
        const step = dt * (left > 0.4 ? 2.2 : 1.4);   // never crawl: finish the stride at a brisk pace
        if (speed > 0 && left > step) { t += step; speed = Math.max(1, speed); }
        else { if (speed > 0) t += left; speed = 0; }
      }
      pose(t);
      return speed;
    },
    // reduced motion / Pause: posed mid-stride and not animated
    setStill(v) { still = v; if (v) { t = wide[0]; speed = 0; pose(t); } else { t = neutral[0]; pose(t); } },
    dispose() {
      mixer.stopAllAction(); mixer.uncacheRoot(model);
      group.removeFromParent();
      model.traverse((o) => {
        o.geometry?.dispose?.();
        for (const m of [].concat(o.material || [])) { for (const k in m) m[k]?.isTexture && m[k].dispose(); m.dispose(); }
      });
    },
  };
  return api;
}
