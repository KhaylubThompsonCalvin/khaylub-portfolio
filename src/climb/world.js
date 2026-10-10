// The Climb's world: one sky, cloud sea and star field whose mood blends between the six stages; the camera follows the
// shared path (path.js), rising over the cloud sea between stages so the veil hides each change of set. Stage modules load
// for the scroll TARGET (a jump builds the destination, not every stage on the way), one ahead, released two behind; each
// built stage stays hidden until its shaders are compiled and its textures uploaded, and the render loop judges quality
// only once the stage in view is ready.
import * as THREE from 'three';
import { createRenderLoop } from '../engine/renderLoop.js';
import { createSky } from '../engine/sky.js';
import { createCloudSea } from '../engine/clouds.js';
import { createStars } from '../engine/stars.js';
import { STAGES, MOODS, stageAt } from './journey.js';
import { createStageSet } from './stageSet.js';
import { CLOUD_TOP, anchorCopy, cameraAt, cloudTopAt } from './path.js';
import { STAGE_LOADERS } from './stages/index.js';
import { loadWanderer, groundPoint, WALK_SPEED } from './wanderer.js';

const MOOD_COLOURS = ['zenith', 'horizon', 'glow', 'cloudLit', 'cloudShade', 'fog', 'light'];
// each mood's colours as sRGB 0..1 triples, read once, so a frame's blend allocates nothing
const MOOD_RGB = MOODS.map((m) => Object.fromEntries(MOOD_COLOURS.map((k) => [k, [1, 3, 5].map((i) => parseInt(m[k].slice(i, i + 2), 16) / 255)])));
const UPLOADS_PER_FRAME = 2;
const CLOUD_LOCAL_TOP = 6;     // createCloudSea's default floor -20 + depth 26
const LIGHT_POOL = 2;          // point lights the world owns; a stage borrows them through ctx.lights (the count never changes)
// the veil: while the stage in view is not built and warmed, the cloud sea closes around the camera (its top VEIL_ABOVE
// metres over the camera, never over CLOUD_TOP), so a jump or a slow download shows cloud, never an empty sky
const VEIL_ABOVE = 14, VEIL_OUT = 2.5;
// the Wanderer's fill in the golden stages (dawn at the Threshold, golden hour at the Harvest): a little warmer than the
// mood's light, so his green pack (one material with the rest of him) reads warm-lit, not olive. Per stage, 0..1.
const GOLDEN = [0, 0, 0.5, 0, 0, 1], WARM_FILL = new THREE.Color('#ffb27a'), WARM_SHARE = 0.6, WARM_LIFT = 0.3;

export function createClimbWorld(canvas) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const loop = createRenderLoop({ canvas, small });
  const renderer = loop.renderer;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(MOODS[0].fog, 400, 2600);
  const camera = new THREE.PerspectiveCamera(small ? 55 : 42, 1, 0.1, 6000);
  const sunDir = new THREE.Vector3(...MOODS[0].sun).normalize();
  const sky = createSky({ sunDir, palette: { zenith: MOODS[0].zenith, horizon: MOODS[0].horizon, sunGlow: MOODS[0].glow, sun: '#fff3dc' } });
  const stars = createStars();
  const clouds = createCloudSea({ sunDir, palette: { cloudLit: MOODS[0].cloudLit, cloudShade: MOODS[0].cloudShade, horizon: MOODS[0].fog }, slices: small ? 24 : 36 });
  const sun = new THREE.DirectionalLight('#ffffff', 1), hemi = new THREE.HemisphereLight('#b9c3d1', '#3a3940', 0.6);
  scene.add(sky, stars, clouds, sun, hemi);
  // a fixed pool of point lights, in the scene from the start at intensity 0, so the scene's light count never changes
  // when a stage appears (a changed count would recompile every lit material, undoing the warm-up). Each stage gets its
  // own unattached PointLights as ctx.lights; the world copies the shown stage's onto the pool each frame.
  const pool = Array.from({ length: LIGHT_POOL }, () => { const l = new THREE.PointLight('#ffffff', 0, 0, 2); scene.add(l); return l; });
  const stageLights = new Map();    // built stage -> its ctx.lights
  loop.onResize((w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); });

  let target = 0, progress = 0, paused = false, stage = 0;
  // the ending (path.js END_*): endTarget is 0..1 through the last stretch of scroll to the page's bottom, from the page;
  // eased like the progress
  let endTarget = 0;
  const ending = { t: 0, portrait: false };

  const buildLog = [];              // every stage index built, in order (read by the behaviour checks)
  // ---- warming: a built stage is hidden until compileAsync has its programs ready and its textures are on the GPU
  const warmed = new WeakSet();
  const pending = new Map();        // stage -> { compiled, left }
  const uploads = [];               // { m, st, tex }, a few uploaded per frame
  const settle = (m, st) => { if (st.compiled && st.left <= 0 && pending.get(m) === st) { pending.delete(m); warmed.add(m); loop.requestDraw(); } };
  function warm(m) {
    const g = m.group;
    if (!g) { warmed.add(m); loop.requestDraw(); return; }
    g.visible = false;
    const tex = new Set();
    g.traverse((o) => {
      for (const mat of [].concat(o.material || [])) {
        for (const k in mat) if (mat[k]?.isTexture) tex.add(mat[k]);
        if (mat.uniforms) for (const u of Object.values(mat.uniforms)) if (u?.value?.isTexture) tex.add(u.value);
      }
    });
    const st = { compiled: false, left: tex.size };
    pending.set(m, st);
    for (const t of tex) uploads.push({ m, st, tex: t });
    // compile only the new stage's materials, with the scene's lights and fog (targetScene), before it is ever drawn;
    // compile() walks every child whether visible or not, so the hidden group is fully covered
    renderer.compileAsync(g, camera, scene)
      .catch((e) => console.warn('Climb: shader warm-up failed; the stage will compile on first draw', e))
      .then(() => { st.compiled = true; settle(m, st); });
    loop.requestDraw();
  }
  // read-only for stages: where the Wanderer stands now (a fresh Vector3 each call), so a stage can aim one of its ctx.lights at him
  const wandererInfo = Object.freeze({
    get position() { return wanderer ? wanderer.group.position.clone() : new THREE.Vector3(NaN, NaN, NaN); },
    copyPosition(out) { return wanderer ? out.copy(wanderer.group.position) : out.set(NaN, NaN, NaN); },   // no allocation: use per frame
  });
  const set = createStageSet({
    count: STAGES.length,
    loaders: STAGE_LOADERS,
    build: (mod, j) => {
      const lights = pool.map(() => new THREE.PointLight('#ffffff', 0, 0, 2));
      const ctx = { scene, renderer, camera, anchor: anchorCopy(j), lights, wanderer: wandererInfo,
        get quality() { return loop.quality.scale; }, get still() { return paused || loop.still; }, requestDraw() { loop.requestDraw(); } };
      return Promise.resolve(mod.build(ctx)).then((m) => {
        const dispose = m.dispose.bind(m);
        stageLights.set(m, lights);
        m.dispose = () => { pending.delete(m); stageLights.delete(m); dispose(); };
        return m;
      });
    },
    // a throw here (warm compiles synchronously) is caught by the stage set, which disposes the stage and retries later
    onBuilt: (j, m) => { buildLog.push(j); warm(m); },
  });

  // ---- loading follows the scroll TARGET, committed once the scroll rests (REST ms with no move) or has held one stage for
  // HOLD ms, so a smooth rail scroll from stage 1 to stage 5 loads stage 5 and its neighbours, not every stage it passes,
  // and a deep link loads its own stage, not stage 1. A stage that failed retries while it is still wanted, backing off.
  const REST = 150, HOLD = 600;
  let wanted = -1, candidate = -1, since = 0, moved = -Infinity, restTimer = 0, lastWant = 0, retryGap = 2000;
  function wantFor(p, now = performance.now(), moving = false) {
    const i = stageAt(p).index;
    if (moving) moved = now;
    if (i !== candidate) { candidate = i; since = now; }
    if (i !== wanted) {
      if (now - moved >= REST || now - since >= HOLD) { wanted = i; retryGap = 2000; lastWant = now; set.want(i); }
      else { clearTimeout(restTimer); restTimer = setTimeout(() => wantFor(target), REST + 10); }
      return;
    }
    if (!set.live.has(i) && now - lastWant > retryGap) { lastWant = now; retryGap = Math.min(retryGap * 2, 30000); set.want(i); }
  }
  const isReady = () => { const m = set.live.get(stage); return !!m && warmed.has(m); };

  // ---- the Wanderer: one instance for the whole journey. Loaded once, warmed like a stage, shown only while the camera rests
  // near an anchor and the stage in view is ready. A failed load is logged and the journey goes on without him.
  const WANDERER_FADE_FROM = 0.04, WANDERER_SHOW_LIFT = 0.075, WALK_FULL = 0.008, ADVANCE_MAX = 3;
  let wanderer = null, wEntry = null, fwdV = new THREE.Vector3(), walkSpeed = 0, advance = 0, lastTarget = 0, scrollRate = 0, wStage = -1;
  const wPos = new THREE.Vector3(), wProj = new THREE.Vector3(), wFeet = { x: 0, y: 0 }, wHead = { x: 0, y: 0 };
  // his x on a stage's trail (pathAt): a short critically damped follow (wX, wVel), so a curved trail or a retuned anchor
  // never snaps him sideways; reset (snapped) at a hidden change of stage and in still mode
  const PATH_FOLLOW = 0.35;         // seconds: the follow's smoothing time
  let wX = 0, wVel = 0, wSnap = true;
  loadWanderer(import.meta.env.BASE_URL + 'models/wanderer-walk.glb').then((w) => {
    wanderer = w; w.setStill(paused || loop.still); scene.add(w.group); wEntry = { group: w.group, dispose() { w.dispose(); } }; warm(wEntry);
  }).catch((e) => console.warn('Climb: the Wanderer did not load; the journey goes on without him', e));
  // where he stands: his depth is the ground under a point of the screen chosen to sit above the caption (lower-left on a
  // wide screen, across the foot of a phone), a few metres ahead of the camera along its heading, nudged on in the direction
  // of travel; his x is the centre of the stage's trail at that depth (pathAt), or that screen point's x on a stage without one
  function placeWanderer(dt) {
    const portrait = camera.aspect < 1;
    camera.updateMatrixWorld();
    // (portrait ending: the gaze lowers and the caption rides up to the middle, so his point rises with it, out into the
    // field above the caption, walking toward the tree and the sun)
    groundPoint(camera, portrait ? 0.12 : 0.34, portrait ? -0.3 + 0.55 * at.end : -0.36, 6, 60, wPos);
    if (stage !== wStage) { wStage = stage; advance = 0; wSnap = true; }
    // the offset grows while he walks and eases back when the scroll rests (hidden changes of stage reset it)
    advance = walkSpeed > 0.05 ? Math.min(ADVANCE_MAX, advance + WALK_SPEED * walkSpeed * dt) : Math.max(0, advance - 0.3 * dt);
    const sm = set.live.get(stage), o = sm?.wanderer?.offset;
    const z = wPos.z - advance + (o?.z || 0);
    // on a stage with a trail (pathAt), his depth stays as above and his x eases onto the trail's centre line
    let x = wPos.x;
    if (sm?.pathAt) {
      const tx = sm.pathAt(z);
      if (wSnap || paused || loop.still || !(dt > 0)) { wX = tx; wVel = 0; }
      else {
        // critically damped follow (the closed form of a spring with smoothing time PATH_FOLLOW), no allocation
        const w = 2 / PATH_FOLLOW, k = w * dt, e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k), c = wX - tx, tmp = (wVel + w * c) * dt;
        wVel = (wVel - w * tmp) * e; wX = tx + (c + tmp) * e;
      }
      wSnap = false; x = wX;
    } else wSnap = true;
    x += o?.x || 0;
    wanderer.group.position.set(x, sm?.groundAt?.(x, z) ?? 0, z);
  }
  function project(y, out) {
    wProj.set(wanderer.group.position.x, y, wanderer.group.position.z).project(camera);
    out.x = (wProj.x + 1) / 2 * innerWidth; out.y = (1 - wProj.y) / 2 * innerHeight; return out;
  }

  // ---- mood: blended in sRGB like the Phase 1-2 hex blend, into the uniforms' own colours (no per-frame allocation)
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (colour, key, a, b, t) => { const A = MOOD_RGB[a][key], B = MOOD_RGB[b][key]; colour.setRGB(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), THREE.SRGBColorSpace); };
  const su = sky.material.uniforms, cu = clouds.userData.uniforms, fillColour = new THREE.Color();
  function applyMood(a, b, t) {
    const A = MOODS[a], B = MOODS[b];
    sunDir.set(lerp(A.sun[0], B.sun[0], t), lerp(A.sun[1], B.sun[1], t), lerp(A.sun[2], B.sun[2], t)).normalize();
    su.uSunDir.value.copy(sunDir); mix(su.uZenith.value, 'zenith', a, b, t); mix(su.uHorizon.value, 'horizon', a, b, t); mix(su.uGlow.value, 'glow', a, b, t);
    cu.uSunDir.value.copy(sunDir); mix(cu.uSunColor.value, 'cloudLit', a, b, t); mix(cu.uShadeColor.value, 'cloudShade', a, b, t); mix(cu.uFogColor.value, 'fog', a, b, t);
    mix(scene.fog.color, 'fog', a, b, t); mix(sun.color, 'light', a, b, t);
    // his faint fill takes the light of the hour (cool at night, amber at golden hour), a touch warmer in the golden stages
    const golden = lerp(GOLDEN[a], GOLDEN[b], t);
    fillColour.copy(sun.color).lerp(WARM_FILL, WARM_SHARE * golden).multiplyScalar(1 + WARM_LIFT * golden);
    wanderer?.setFill(fillColour);
    sun.intensity = lerp(A.sunI, B.sunI, t); sun.position.copy(sunDir).multiplyScalar(1000);
    hemi.intensity = lerp(A.hemi, B.hemi, t); renderer.toneMappingExposure = lerp(A.exposure, B.exposure, t);
    stars.material.uniforms.uOpacity.value = lerp(A.stars, B.stars, t);
  }

  const at = { pos: new THREE.Vector3(), look: new THREE.Vector3(), lift: 0, from: 0, to: 0, mix: 0, end: 0 };
  function frame(dt, now) {
    wantFor(target, now);
    // the camera eases after the page's scroll (native scroll, never hijacked)
    const ease = paused || loop.still ? 1 : 1 - Math.exp(-dt * 4);
    progress += (target - progress) * ease;
    ending.t += (endTarget - ending.t) * ease; if (Math.abs(endTarget - ending.t) < 1e-4) ending.t = endTarget;
    ending.portrait = camera.aspect < 1;
    stage = stageAt(progress).index;      // changes at the top of each transit, above the clouds
    cameraAt(progress, at, ending);
    // each stage's own mood on its anchor; the light changes during the transit, under cover of the clouds
    applyMood(at.from, at.to, at.mix);
    camera.position.copy(at.pos); camera.lookAt(at.look);
    sky.position.copy(at.pos); stars.position.copy(at.pos);   // the dome travels with the camera along the 3 km path
    // the veil closes at once when the stage in view is not ready (the stage index changes at the top of a transit, where
    // the sea is already at CLOUD_TOP, so closing it there is seamless) and eases away once the stage is warmed
    const want = isReady() ? 0 : 1, wasVeil = veil;
    veil = want > veil || paused || loop.still ? want : veil + (want - veil) * (1 - Math.exp(-dt * VEIL_OUT));
    if (veil < 0.01) veil = 0;
    if (veil !== wasVeil) loop.requestDraw();
    const top = Math.max(cloudTopAt(at.lift), cloudTopAt(0) + (Math.min(at.pos.y + VEIL_ABOVE, CLOUD_TOP) - cloudTopAt(0)) * veil);
    clouds.visible = at.lift > 0.001 || veil > 0;
    clouds.position.set(at.pos.x, top - CLOUD_LOCAL_TOP, at.pos.z);
    if (!paused) { cu.uTime.value += dt * 10; stars.material.uniforms.uTime.value += dt; }
    for (let n = 0; n < UPLOADS_PER_FRAME && uploads.length;) {
      const u = uploads.shift();
      if (pending.get(u.m) !== u.st) continue;           // its stage was released while waiting
      renderer.initTexture(u.tex); u.st.left--; n++; settle(u.m, u.st);
    }
    if (pending.size) loop.requestDraw();                // keep still mode drawing until warming is done
    // the Wanderer walks as fast as the scroll target is moving, and settles on a neutral stride frame when it rests
    scrollRate += (Math.abs(target - lastTarget) / Math.max(dt, 1e-3) - scrollRate) * (1 - Math.exp(-dt * 4)); lastTarget = target;
    if (wanderer && warmed.has(wEntry)) {
      const sm = set.live.get(stage);
      const fade = sm?.wanderer?.hide || !isReady() ? 0 : Math.min(1, Math.max(0, (WANDERER_SHOW_LIFT - at.lift) / (WANDERER_SHOW_LIFT - WANDERER_FADE_FROM)));
      const show = fade > 0;
      wanderer.setFade(fade);
      if (show !== wanderer.group.visible) { wanderer.group.visible = show; loop.requestDraw(); }
      if (show) {
        const still = paused || loop.still;
        walkSpeed = still ? 0 : wanderer.update(dt, Math.min(1, scrollRate / WALK_FULL));
        placeWanderer(dt);
        if (walkSpeed > 0) loop.requestDraw();
      }
    }
    frameDt = dt; shownLights = null; set.live.forEach(showStage);   // forEach: no per-frame entry arrays
    for (let k = 0; k < pool.length; k++) {
      const src = shownLights?.[k], l = pool[k];
      if (!src) { l.intensity = 0; continue; }
      l.position.copy(src.position); l.color.copy(src.color); l.intensity = src.intensity; l.distance = src.distance; l.decay = src.decay;
    }
    renderer.render(scene, camera);
  }
  // a loading token is never warmed, so it is skipped; only the stage in view is shown
  let frameDt = 0, shownLights = null, veil = 1;
  function showStage(m, j) {
    if (!warmed.has(m)) return;
    if (m.group) m.group.visible = j === stage;
    if (j === stage) shownLights = stageLights.get(m);
    m.update?.(frameDt, Math.min(1, Math.max(0, progress * STAGES.length - j)));
  }
  applyMood(0, 0, 0);
  loop.start(frame, isReady);
  canvas.classList.add('ready');
  return {
    // p: the journey's progress 0..1; end: 0..1 through the last stretch of scroll to the page's bottom (the ending)
    setProgress(p, end = 0) { target = p; endTarget = end; wantFor(p, performance.now(), true); loop.requestDraw(); },
    setPaused(v) { paused = v; loop.setStill(v); wanderer?.setStill(v); loop.requestDraw(); },
    get paused() { return paused; }, get draws() { return loop.draws; }, get quality() { return loop.quality.scale; }, get stage() { return stage; },
    get ready() { return isReady(); }, get progress() { return progress; }, get lift() { return at.lift; }, get built() { return set.entries().filter(([, m]) => warmed.has(m)).map(([j]) => j).sort(); }, get buildLog() { return buildLog.slice(); },
    get veil() { return veil; },
    get wanderer() { return wanderer ? { loaded: true, ready: warmed.has(wEntry), visible: wanderer.group.visible, walking: wanderer.walking, height: wanderer.height, feet: project(0, wFeet), head: project(wanderer.height, wHead), x: wanderer.group.position.x, z: wanderer.group.position.z, pathX: set.live.get(stage)?.pathAt?.(wanderer.group.position.z) ?? null, away: (() => { fwdV.set(1, 0, 0).transformDirection(wanderer.group.matrixWorld); const dx = wanderer.group.position.x - camera.position.x, dz = wanderer.group.position.z - camera.position.z, l = Math.hypot(dx, dz) || 1; return (fwdV.x * dx + fwdV.z * dz) / l; })(), camZ: camera.position.z } : { loaded: false }; },
    get drawCalls() { return renderer.info.render.calls; }, get cloudsVisible() { return clouds.visible; }, get cloudTop() { return clouds.position.y + CLOUD_LOCAL_TOP; }, get camY() { return camera.position.y; }, get lightCount() { let n = 0; scene.traverse((o) => { if (o.isLight) n++; }); return n; },
  };
}
