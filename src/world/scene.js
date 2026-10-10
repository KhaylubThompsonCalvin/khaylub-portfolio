// The summit world: one ledge above a sea of clouds, four stations, four times of day.
// Each page is a landing: the camera arrives at that page's station (gliding from the page you came from), and the
// sky shifts to that page's light. Home: golden hour. Films: sunset. Questions: blue hour with stars (the palette's
// cool horizon stands for open questions). Builds: dawn. Respects prefers-reduced-motion and the Pause motion button.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createSky } from '../engine/sky.js';
import { createCloudSea } from '../engine/clouds.js';
import { createRange } from '../engine/peaks.js';
import { createStars } from '../engine/stars.js';
import { createRenderLoop } from '../engine/renderLoop.js';
import { loadStations, LEDGE_TOP, signTargets } from './stations.js';
import { createPhoenixFlight } from '../engine/phoenix.js';

const BASE = {
  zenith: '#2b333d', horizon: '#d9a878', sunGlow: '#f0b878', sun: '#fff3dc',
  cloudLit: '#fbf3e8', cloudShade: '#8a8d98', rock: '#2c2e34', snow: '#f1ebe2',
};

export const MOODS = {
  home:      { sun: [-0.55, 0.10, -1], zenith: '#2b333d', horizon: '#d9a878', glow: '#f0b878', cloudLit: '#fbf3e8', cloudShade: '#8a8d98', fog: '#8f96a1', light: '#ffd9a8', sunI: 3.2, hemi: 0.9, exposure: 1.05, stars: 0 },
  films:     { sun: [-0.35, 0.03, -1], zenith: '#2a2630', horizon: '#e39a62', glow: '#f29a58', cloudLit: '#f9dcc0', cloudShade: '#7b6f78', fog: '#9a8580', light: '#ffb98a', sunI: 2.6, hemi: 1.05, exposure: 1.12, stars: 0.1 },   // sunset, with fill so the camera is not a silhouette
  questions: { sun: [0.15, -0.08, -1], zenith: '#0e1622', horizon: '#7ea6b8', glow: '#9fb6c8', cloudLit: '#c9d6e2', cloudShade: '#3f4c5e', fog: '#4b5a6b', light: '#9db4cf', sunI: 0.7, hemi: 0.85, exposure: 1.22, stars: 1 },   // blue hour, with a cool fill so the telescope reads
  builds:    { sun: [0.6, 0.08, -1], zenith: '#3a4656', horizon: '#e8c4a6', glow: '#ffd2a8', cloudLit: '#fff6ec', cloudShade: '#9298a6', fog: '#a7a9b1', light: '#ffe2c2', sunI: 3.2, hemi: 1.3, exposure: 1.22, stars: 0 },   // dawn, lifted (owner 2026-10-09: "a little dark")
};

// one viewpoint per page, in metres; the ledge top is at LEDGE_TOP (16 m), the cloud tops near 6 m
const H = LEDGE_TOP;
const DEBUG_PCAM = new URLSearchParams(location.search).has('pcam');
const PCAM_DIST = Number(new URLSearchParams(location.search).get('pd')) || 30;   // ?pd=<m>: chase distance
export const VIEWS = {
  home:      { pos: [-4.2, H + 1.7, 7.2],  look: [-2.2, H + 0.4, -24] },  // fire, Wanderer and bench right of the caption
  films:     { pos: [-10.3, H + 0.2, 0.1], look: [-9.2, H - 1.2, -3.3] },   // the film camera centred, its chair and slate around it
  questions: { pos: [6.3, H + 0.5, 1.7],   look: [4.9, H + 3.2, -27.9] },  // the sky, with the telescope whole in frame
  builds:    { pos: [3.0, H + 1.0, 3.4],   look: [8.6, H - 2.2, -6.6] },
};
// tall phone screens crop the sides, which lost the film camera and the telescope: there the view turns sideways
// (same height, same tilt) to centre the station's own prop, at (x, z) on the ledge
const PORTRAIT_SUBJECT = { home: [-1.6, 0.8], films: [-9.0, -3.4], questions: [7.5, -3.5] };   // home: between fire and Wanderer
function viewFor(name) {
  const v = VIEWS[name] || VIEWS.home, subject = PORTRAIT_SUBJECT[name];
  if (!subject || window.innerHeight <= window.innerWidth * 1.2) return v;
  const [px, py, pz] = v.pos, [lx, ly, lz] = v.look;
  const reach = Math.hypot(lx - px, lz - pz), yaw = Math.atan2(subject[0] - px, subject[1] - pz);
  return { pos: v.pos, look: [px + Math.sin(yaw) * reach, ly, pz + Math.cos(yaw) * reach] };
}

function readPaused() { try { return localStorage.getItem('summit-motion') === 'paused'; } catch { return false; } }
function writePaused(v) { try { localStorage.setItem('summit-motion', v ? 'paused' : 'on'); } catch { /* storage blocked: the toggle still works on this page */ } }
function readFrom() { try { return sessionStorage.getItem('summit-from'); } catch { return null; } }
function writeFrom(v) { try { sessionStorage.setItem('summit-from', v); } catch { /* fine without it */ } }

export function createWorld(canvas, page) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduce || readPaused();
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  // the shared render loop (src/engine/renderLoop.js): the renderer, a pixel budget, resolution that adapts to how
  // fast the machine actually draws, still mode for a software renderer, and a ~60 fps cap (owner 2026-10-09)
  const loop = createRenderLoop({ canvas, small });
  const renderer = loop.renderer;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#8f96a1', 700, 3000);
  const camera = new THREE.PerspectiveCamera(small ? 55 : 42, 1, 0.1, 6000);

  const sunDir = new THREE.Vector3(...MOODS.home.sun).normalize();
  const sky = createSky({ sunDir, palette: BASE });
  scene.add(sky);
  const stars = createStars();
  scene.add(stars);
  const clouds = createCloudSea({ sunDir, palette: BASE, slices: small ? 24 : 36 });
  scene.add(clouds);

  const sun = new THREE.DirectionalLight('#ffd9a8', 3.2);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight('#b9c3d1', '#3a3940', 0.9);
  scene.add(hemi);

  // arriving from the Climb (?arrive=1): the visitor has already climbed, so the Summit opens settled at Home
  if (new URLSearchParams(location.search).has('arrive')) {
    writeFrom(page);                                   // no "came from" page, so no glide
    // drop only ?arrive and keep the other parameters byte for byte (URLSearchParams would rewrite "fps" as "fps=")
    // a malformed escape (?%E0=1) is kept as typed rather than throwing and stopping the Summit
    const name = (p) => { try { return decodeURIComponent(p.split('=')[0]); } catch { return p.split('=')[0]; } };
    const kept = location.search.slice(1).split('&').filter((p) => p && name(p) !== 'arrive').join('&');
    history.replaceState(history.state, '', location.pathname + (kept ? '?' + kept : '') + location.hash);
    window.__summitArrived = true;
  }

  // ---- the glide: from mood/view A to mood/view B over cam.t. On a full page load A is the page the visitor came
  // from (sessionStorage); when main.js swaps pages in place, goTo() restarts the glide from wherever the camera is.
  const from = readFrom();
  const came = from && from !== page && MOODS[from] ? from : null;
  let current = MOODS[page] ? page : 'home';
  let target = MOODS[current];
  let moodA = came ? MOODS[came] : target;
  let arc = !!came;                                   // the glide crosses the summit in a gentle arc
  const vA = viewFor(came || current), vB = viewFor(current);
  const cam = { t: came && !paused ? 0 : 1, look: new THREE.Vector3(), pointer: new THREE.Vector2(), sway: new THREE.Vector2() };
  writeFrom(current);
  const col = (c) => new THREE.Color(c);
  // a mood frozen part way between two others, so a glide interrupted by another click starts from what is on screen
  function mixMood(a, b, k) {
    const out = {};
    for (const key of Object.keys(b)) {
      if (key === 'sun') out.sun = new THREE.Vector3(...a.sun).normalize().lerp(new THREE.Vector3(...b.sun).normalize(), k).toArray();
      else if (typeof b[key] === 'number') out[key] = THREE.MathUtils.lerp(a[key], b[key], k);
      else out[key] = col(a[key]).lerp(col(b[key]), k);
    }
    return out;
  }

  function applyMood(k) {
    const a = moodA, b = target;
    const lc = (x, y) => col(x).lerp(col(y), k);
    sunDir.set(...a.sun).normalize().lerp(new THREE.Vector3(...b.sun).normalize(), k).normalize();
    const su = sky.material.uniforms;
    su.uSunDir.value.copy(sunDir); su.uZenith.value.copy(lc(a.zenith, b.zenith)); su.uHorizon.value.copy(lc(a.horizon, b.horizon));
    su.uGlow.value.copy(lc(a.glow, b.glow));
    const cu = clouds.userData.uniforms;
    cu.uSunDir.value.copy(sunDir); cu.uSunColor.value.copy(lc(a.cloudLit, b.cloudLit)); cu.uShadeColor.value.copy(lc(a.cloudShade, b.cloudShade));
    cu.uFogColor.value.copy(lc(a.fog, b.fog));
    scene.fog.color.copy(lc(a.fog, b.fog));
    sun.color.copy(lc(a.light, b.light)); sun.intensity = THREE.MathUtils.lerp(a.sunI, b.sunI, k);
    sun.position.copy(sunDir).multiplyScalar(1000);
    hemi.intensity = THREE.MathUtils.lerp(a.hemi, b.hemi, k);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(a.exposure, b.exposure, k);
    stars.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(a.stars, b.stars, k);
  }

  // ---- models: peaks in the middle distance, the ledge and its stations, the phoenix on the home page
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const mixers = [];
  // Every model loads into `staging`, off the scene. Drawing a model for the first time compiles its shaders and
  // uploads its textures in one blocking step (frozen frames of 200 to 400 ms on each page arrival), so the staging
  // set is prepared in the background first, then joins the scene whole, and only then does the camera glide.
  const staging = new THREE.Group();
  const loads = [];
  loads.push(createRange({ palette: BASE }).then((range) => staging.add(range)));
  loads.push(loadStations(staging, scene, page, { onMixer: (m) => mixers.push(m) }).catch((e) => console.warn('stations', e)));
  loads.push(loader.loadAsync('/models/alpine-peak.glb').then((g) => {
    const spots = [[-420, -1150, 300, 20], [300, -1350, 380, 140], [-980, -1550, 460, 75], [860, -1050, 260, 250], [60, -1900, 560, 310]];
    for (const [x, z, h, yaw] of spots) {
      const m = g.scene.clone(true);
      const box = new THREE.Box3().setFromObject(m); const s = h / box.getSize(new THREE.Vector3()).y;
      m.scale.setScalar(s); m.rotation.y = THREE.MathUtils.degToRad(yaw);
      const b2 = new THREE.Box3().setFromObject(m);
      m.position.set(x, -b2.min.y - h * 0.28, z);    // about a third of each peak stays under the cloud sea
      staging.add(m);
    }
  }).catch((e) => console.warn('peaks', e)));
  // the phoenix flies on the home page only; it loads with everything else so a glide home never waits on it
  let phoenix = null;
  loads.push(loader.loadAsync('/models/phoenix-flap.glb').then((g) => {
    phoenix = createPhoenixFlight(g);
    if (DEBUG_PCAM) window.__phoenix = { g, phoenix };
    staging.add(phoenix.group);                        // hidden off the home page only after the shader warm-up below
    // ?pt=<s> fast-forwards the flight (for screenshots)
    const pt = Number(new URLSearchParams(location.search).get('pt') || 0);
    for (let t = 0; t < pt; t += 1 / 30) phoenix.update(1 / 30);
  }).catch((e) => console.warn('phoenix', e)));
  let ready = false;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
  Promise.all(loads).then(async () => {
    // the warm-up only compiles visible objects, so the phoenix hides after it (else its first glide home stutters)
    try { await renderer.compileAsync(staging, camera, scene); } catch (e) { console.warn('compile', e); }
    if (phoenix) phoenix.group.visible = current === 'home';
    const textures = new Set();
    staging.traverse((o) => { for (const m of [].concat(o.material || [])) for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); });
    // uploads are spread by time, not by frame: on a 240 Hz display "one per frame" was one every 4 ms, back to back
    let budgetStart = performance.now();
    for (const t of textures) {
      renderer.initTexture(t);
      if (performance.now() - budgetStart > 8) { await nextFrame(); budgetStart = performance.now(); }
    }
    scene.add(staging);
    loop.requestDraw();
  }).finally(() => { ready = true; canvas.classList.add('ready'); });   // the canvas fades up (style.css)
  setTimeout(() => { ready = true; canvas.classList.add('ready'); }, 12000);  // a stuck connection never holds the camera longer than this

  // the loop sizes the renderer (window resize or a quality change); the camera follows here
  loop.onResize((w, h) => {
    camera.aspect = w / h;
    // tall phone screens: the caption spans the bottom, so the picture shifts up by a fifth and each station's
    // subject sits above the text (the view slides; the camera angle does not change)
    if (h > w * 1.2) camera.setViewOffset(w, h, 0, h * 0.2, w, h); else camera.clearViewOffset();
    { const v = viewFor(current); lb.set(...v.look); if (cam.t >= 1) la.copy(lb); }   // a phone turned sideways re-aims
    camera.updateProjectionMatrix();
  });
  window.addEventListener('pointermove', (e) => cam.pointer.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5));
  // the signpost boards are a shortcut: a click on one (outside any link or button) opens that page
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function boardAt(e) {
    if (!signTargets.length || e.target.closest('a, button, .card, .band, header, footer')) return null;
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(signTargets)[0]?.object || null;
  }
  window.addEventListener('click', (e) => { const b = boardAt(e); if (b) window.dispatchEvent(new CustomEvent('summit:navigate', { detail: b.userData.href })); });
  window.addEventListener('pointermove', (e) => { document.body.style.cursor = boardAt(e) ? 'pointer' : ''; });
  let scrollK = 0;
  window.addEventListener('scroll', () => { scrollK = Math.min(1, window.scrollY / window.innerHeight); }, { passive: true });

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let clockT = 0;
  const pa = new THREE.Vector3(...vA.pos), pb = new THREE.Vector3(...vB.pos), la = new THREE.Vector3(...vA.look), lb = new THREE.Vector3(...vB.look);

  // main.js swapped the page content in place: glide there from wherever the camera is now (no reload, no rebuild)
  function goTo(next) {
    if (!MOODS[next] || next === current) return;
    const k = ease(cam.t);
    moodA = mixMood(moodA, target, k);
    pa.lerpVectors(pa, pb, k); la.lerpVectors(la, lb, k);
    target = MOODS[next]; const v = viewFor(next); pb.set(...v.pos); lb.set(...v.look);
    current = next; arc = true; cam.t = paused ? 1 : 0;
    if (phoenix) phoenix.group.visible = next === 'home';
    writeFrom(next);
    loop.requestDraw();
  }

  const lookAt = new THREE.Vector3();
  const chase = { s: 0, live: false, bird: new THREE.Vector3(), side: new THREE.Vector3(), want: new THREE.Vector3(), wantLook: new THREE.Vector3(),
    pos: new THREE.Vector3(), look: new THREE.Vector3(), start: new THREE.Vector3(), c1: new THREE.Vector3(), c2: new THREE.Vector3() };
  const camQ = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _v = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const _curve = new THREE.CubicBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());

  // one drawn frame; the loop calls it at most ~60 times a second and, in still mode, only when a redraw is needed
  function frame(dt) {
    if (loop.still) cam.t = 1;                        // still mode: page changes cut instead of gliding
    if (!paused) {
      clockT += dt;
      clouds.userData.uniforms.uTime.value += dt * 10;
      stars.material.uniforms.uTime.value += dt;
      for (const m of mixers) m.update(dt);
    }
    // the glide waits until the models are ready, so it never stutters on their first draw
    if (cam.t < 1 && (ready || paused)) cam.t = paused ? 1 : Math.min(1, cam.t + dt / 3.2);
    const k = ease(cam.t);
    applyMood(k);
    camera.position.lerpVectors(pa, pb, k);
    // a gentle arc between stations, so the glide reads as crossing the summit, not sliding through the rock
    if (arc) camera.position.y += Math.sin(Math.PI * k) * 2.2;
    cam.look.lerpVectors(la, lb, k);
    // scrolling lifts the view a little toward the sky; the pointer adds a small parallax
    camera.position.y += scrollK * 0.8;
    if (!paused) cam.sway.lerp(cam.pointer, 0.04);
    lookAt.set(cam.look.x + cam.sway.x * 3.0, cam.look.y - cam.sway.y * 1.6 + scrollK * 6, cam.look.z);
    if (phoenix && !paused) phoenix.update(dt);
    // Home, scrolled: the camera leaves the fire and flies beside the phoenix (owner 2026-10-09: the close shot;
    // then "the scroll should be more smoother"). A real camera move, not a blend of two views:
    //  - the scroll position eases in like a spring, so mouse-wheel steps never jump;
    //  - the camera first turns toward the bird, then travels, on an arc that rises clear of the rock and the clouds;
    //  - it turns by rotating its orientation (a slerp), so the view never swings between two far-apart aim points.
    // It rides 30 m off the bird's wing, never below the cloud tops; while the bird is under the clouds it waits above
    // the spot where it will burst out. Scrolling back up plays the same move in reverse.
    camQ.setFromRotationMatrix(_m.lookAt(camera.position, lookAt, UP));
    // the flight plays out within Home's clear stretch (.flight-space), before the bands; never with motion paused
    const wantChase = current === 'home' && phoenix && phoenix.group.visible && !paused ? THREE.MathUtils.smootherstep(scrollK, 0.05, 0.7) : 0;
    // the whole trip out (or back) takes about 3 s however fast the page is scrolled: the bird is 350 to 600 m away,
    // and a faster hand-off moved the camera 30 to 40 m per frame, a lurch rather than a flight
    chase.s += THREE.MathUtils.clamp((wantChase - chase.s) * (1 - Math.exp(-dt * 3)), -dt / 3, dt / 3);
    if (chase.s > 0.0005) {
      phoenix.focus.getWorldPosition(chase.bird);          // the bird's body, not its root point
      chase.side.set(1, 0, 0).applyQuaternion(phoenix.holder.quaternion);
      chase.want.copy(chase.bird).addScaledVector(chase.side, 30); chase.want.y = Math.max(chase.want.y + 5, 14);
      chase.wantLook.copy(chase.bird); chase.wantLook.y = Math.max(chase.wantLook.y, 2);
      if (!chase.live) { chase.pos.copy(chase.want); chase.look.copy(chase.wantLook); chase.live = true; }
      // damped, so the turns of the flight never jerk the view, and capped like a camera operator's pace (45 m/s), so
      // when the bird finishes its dive and reappears ~150 m away at the start of its path the camera follows, not lunges
      const f = 1 - Math.exp(-dt * 4), cap = 45 * dt;
      _v.copy(chase.want).sub(chase.pos).multiplyScalar(f).clampLength(0, cap); chase.pos.add(_v);
      // the aim follows closer than the position (a lagging aim left the bird cut off at the frame's corner)
      _v.copy(chase.wantLook).sub(chase.look).multiplyScalar(1 - Math.exp(-dt * 10)).clampLength(0, cap * 3); chase.look.add(_v);
      const e = chase.s;
      // travel: a cubic arc from the station up and out to the chase point (starts once the turn is under way)
      const t = THREE.MathUtils.smootherstep(e, 0.15, 1);
      const lift = Math.min(60, chase.start.copy(camera.position).distanceTo(chase.pos) * 0.12);
      chase.c1.copy(chase.start).add(_v.set(0, lift, 0));
      chase.c2.copy(chase.pos).add(_v.set(0, lift * 0.6, 0));
      _curve.v0.copy(chase.start); _curve.v1.copy(chase.c1); _curve.v2.copy(chase.c2); _curve.v3.copy(chase.pos);
      _curve.getPoint(t, camera.position);
      // turn: from the station's view to looking at the bird from wherever the camera now is
      const lookBird = _q2.setFromRotationMatrix(_m.lookAt(camera.position, chase.look, UP));
      camQ.slerp(lookBird, THREE.MathUtils.smootherstep(e, 0, 0.5));
    } else chase.live = false;
    camera.quaternion.copy(camQ);
    if (phoenix && DEBUG_PCAM) {                     // ?pcam: a chase view of the phoenix, for checking its flight
      const hp = phoenix.holder.position, side = new THREE.Vector3(1, 0, 0).applyQuaternion(phoenix.holder.quaternion);
      camera.position.copy(hp).addScaledVector(side, PCAM_DIST).add(new THREE.Vector3(0, PCAM_DIST / 6, 0)); camera.lookAt(hp);
      for (const el of document.querySelectorAll('main, footer, header, .scrim')) el.style.display = 'none';
    }
    renderer.render(scene, camera);
  }
  applyMood(cam.t);
  loop.start(frame, () => ready);

  return {
    get paused() { return paused; },
    get page() { return current; },
    get draws() { return loop.draws; },
    get quality() { return loop.quality.scale; },
    setPaused(v) { paused = v; writePaused(v); },
    goTo,
  };
}
