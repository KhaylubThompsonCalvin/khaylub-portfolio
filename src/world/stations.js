// The summit ledge and its four stations. Every model is normalized by its bounding box (models arrive at
// arbitrary scale), sized in metres, and set on the ledge top. Models load per page, the current station first.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createPeak } from '../engine/peaks.js';
import { runInWorker } from '../engine/worker.js';
import { ledgeHeights } from '../engine/ledgeHeights.js';
import { createCampfire } from '../engine/campfire.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export const LEDGE_TOP = 16;     // metres; the cloud tops sit near 6, so the summit stands clear of the sea

// [file, size in metres along the chosen axis, axis, position on the ledge (x, z), yaw in degrees, station]
const PLACEMENTS = [
  ['summit-ledge', 26, 'x', [0, 0], 0, 'all'],
  ['signpost', 2.6, 'y', [0.6, -1.2], -20, 'home'],
  ['wanderer-searching', 0, 'y', [-0.7, -0.2], -68, 'home'],   // seated, resting, looking out at the far range
  ['backpack', 0.7, 'y', [1.9, -0.4], -40, 'home'],
  ['campfire', 1.1, 'x', [-2.4, 1.6], 0, 'home'],
  ['film-camera', 1.1, 'y', [-9.0, -3.4], 160, 'films'],         // sized by its reels (about 36 cm, like a real magazine), not total height: the model's three-legged stand is short
  ['telescope', 1.6, 'y', [7.5, -3.5], -150, 'questions'],
  ['journal-compass', 0.3, 'x', [4.6, 1.4], 25, 'builds'],      // a real journal is 25 to 30 cm wide
  ['lantern', 0.34, 'y', [5.2, 1.0], 0, 'builds'],              // a hurricane lantern, about 34 cm
  // set dressing props (models in /models/props/)
  ['props/log-bench', 1.9, 'x', [-2.6, 0.2], -18, 'home'],   // a seat across the fire from the home view, clear of it
  ['props/ice-axe', 0.75, 'y', [1.5, -2.1], 15, 'home'],
  ['props/wind-pine', 2.4, 'y', [-6.5, -6.5], 40, 'home'],
  ['props/directors-chair', 0.95, 'y', [-7.9, -3.0], 205, 'films'],   // beside the camera, same distance from the view, so sizes compare true
  ['props/clapperboard', 0.32, 'x', [-8.5, -3.1], 160, 'films'],     // on the ground between the camera and the chair
  ['props/armillary-sphere', 0.5, 'y', [6.7, -2.7], 0, 'questions'],
  ['props/hourglass', 0.24, 'y', [7.1, -2.1], 0, 'questions'],   // a desk hourglass, about 24 cm
  ['props/multimeter', 0.2, 'x', [4.15, 1.05], -20, 'builds'],
  ['props/drafting-tools', 0.32, 'x', [5.0, 1.9], 40, 'builds'],
];

function fit(root, size, axis) {
  // size 0 keeps the model's own metres (the Wanderer is authored to scale); boxes are measured on the posed,
  // skinned vertices (precise), so a seated character is not sized by its standing rest pose
  root.updateMatrixWorld(true);
  if (size) {
    const dim = new THREE.Box3().setFromObject(root, true).getSize(new THREE.Vector3());
    root.scale.setScalar(size / (axis === 'y' ? dim.y : axis === 'x' ? dim.x : dim.z));
    root.updateMatrixWorld(true);
  }
  const b2 = new THREE.Box3().setFromObject(root, true);
  const c = b2.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= b2.min.y;   // centred, standing on y = 0
  const g = new THREE.Group(); g.add(root);
  return g;
}

// the ledge is uneven: each object drops onto the rock straight down. The ~80k-triangle pass runs in the worker (about
// 140 ms on the main thread, four times that on a weak laptop); the main thread only copies the arrays across
async function settleHeights(ledge, spots) {
  const meshes = [];
  ledge.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const interleaved = pos.isInterleavedBufferAttribute;
    meshes.push({ array: (interleaved ? pos.data.array : pos.array).slice(), stride: interleaved ? pos.data.stride : pos.itemSize, offset: interleaved ? pos.offset : 0,
      count: pos.count, normalized: pos.normalized, index: idx ? idx.array.slice() : null, matrix: o.matrixWorld.toArray() });
  });
  const data = await runInWorker('heights', { meshes, spots }, meshes.flatMap((m) => [m.array.buffer, m.index?.buffer].filter(Boolean)));
  const heights = data ? data.heights : ledgeHeights(meshes.map((m) => ({ ...m })), spots);
  return heights.map((y) => (Number.isFinite(y) ? y : LEDGE_TOP));
}

// Model measuring (fit) is 5 to 30 ms each, and all 17 models arrive in a burst; this hands each one its own frame
let turn = Promise.resolve();
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
const myTurn = () => (turn = turn.then(nextFrame));

// Models go into `parent` (kept off the scene until they are ready to draw); lights go straight into `scene`, before any
// model, so the light count never changes after the first frame (a change recompiles every material's shader)
export async function loadStations(parent, scene, page, { onMixer } = {}) {
  const order = [...PLACEMENTS].sort((a, b) => (b[5] === page) - (a[5] === page));   // this page's station first
  const ledgeSpec = order.splice(order.findIndex((p) => p[0] === 'summit-ledge'), 1)[0];
  const lights = {};
  for (const file of ['campfire', 'lantern']) {
    const l = new THREE.PointLight('#ffb36b', file === 'campfire' ? 6 : 3.4, file === 'campfire' ? 7 : 5, 2);
    const [x, z] = PLACEMENTS.find((p) => p[0] === file)[3];
    l.position.set(x, LEDGE_TOP, z);
    scene.add(l); lights[file] = l;
  }
  // the Films station's key light, as on a film set: soft warm light from in front of the camera, so the dark metal
  // reads as a camera against the sunset instead of a silhouette (added with the other lights, before any model)
  const key = new THREE.PointLight('#ffd6a8', 9, 7, 2);
  key.position.set(-9.9, LEDGE_TOP + 0.4, -1.4);
  scene.add(key);
  // the mountain under the ledge, so the summit rises out of the cloud sea instead of floating on it (built in a worker)
  const bodyReady = createPeak({ radius: 60, height: 34, seed: 9, palette: { rock: '#2a2b30', snow: '#d9d4cc' } });
  const ledgeGltf = await loader.loadAsync(`/models/${ledgeSpec[0]}.glb`);
  const ledge = fit(ledgeGltf.scene, ledgeSpec[1], ledgeSpec[2]);
  ledge.position.set(0, LEDGE_TOP - new THREE.Box3().setFromObject(ledge).getSize(new THREE.Vector3()).y, 0);
  parent.add(ledge);
  bodyReady.then((body) => { body.position.set(0, LEDGE_TOP - 26, -4); parent.add(body); });
  ledge.updateMatrixWorld(true);
  const heightsReady = settleHeights(ledge, order.map((p) => p[3]));
  await Promise.all(order.map(async ([file, size, axis, [x, z], yaw], i) => {
    const gltf = await loader.loadAsync(`/models/${file}.glb`);
    await myTurn();
    let mixer = null;
    if (gltf.animations?.length) {                      // pose it before measuring
      mixer = new THREE.AnimationMixer(gltf.scene);
      mixer.clipAction(gltf.animations[0]).play(); mixer.update(0);
      gltf.scene.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; });
    }
    const obj = fit(gltf.scene, size, axis);
    obj.rotation.y = THREE.MathUtils.degToRad(yaw);
    obj.position.set(x, (await heightsReady)[i], z);
    parent.add(obj);
    if (mixer && onMixer) onMixer(mixer);
    if (file === 'signpost') addSignLabels(scene, obj);
    if (lights[file]) lights[file].position.y = obj.position.y + (file === 'campfire' ? 0.5 : 0.25);
    if (file === 'campfire') {                          // flames, sparks and a breathing light over the model's baked flame
      const fire = createCampfire({ size, light: lights.campfire });
      fire.group.position.copy(obj.position);
      parent.add(fire.group);
      if (onMixer) onMixer(fire);                       // updated each frame with the animations, paused with them
    }
    if (file === 'lantern') {                           // the lantern is lit: a small flame in the glass, a glow, its light breathing
      const flame = createCampfire({ size: 0.075, light: lights.lantern, sparks: false, glow: true });
      flame.group.position.copy(obj.position).add(new THREE.Vector3(0, size * 0.3, 0));
      parent.add(flame.group);
      if (onMixer) onMixer(flame);
    }
  }));
  await bodyReady;
  return { ledge, lamps: Object.values(lights) };
}

// Films, Questions, Builds painted on the three boards (heights measured on the model at 2.6 m tall).
// Decorative for screen readers (the canvas is aria-hidden); a click on a board goes to that page.
export const signTargets = [];
function addSignLabels(scene, post) {
  const B = import.meta.env.BASE_URL;   // "/", or "/summit/" in the combined deploy
  const boards = [['FILMS', B + 'films/', 2.3], ['QUESTIONS', B + 'questions/', 1.9], ['BUILDS', B + 'builds/', 1.5]];
  for (const [text, href, y] of boards) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.font = '700 70px "KT Sans", "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(20,12,6,0.85)'; g.fillText(text, 259, 67);        // a carved shadow under the paint
    g.fillStyle = '#f3e7d3'; g.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
    sp.scale.set(0.8, 0.2, 1);
    // just in front of the boards, toward the home view, so the wood never cuts the words
    sp.position.copy(post.position).add(new THREE.Vector3(-0.2, y, 0.38));
    sp.userData.href = href;
    scene.add(sp); signTargets.push(sp);
  }
}

export function stationTarget(page) {
  const spec = { home: 'signpost', films: 'film-camera', questions: 'telescope', builds: 'journal-compass' }[page] || 'signpost';
  const p = PLACEMENTS.find((q) => q[0] === spec);
  return new THREE.Vector3(p[3][0], LEDGE_TOP, p[3][1]);
}
