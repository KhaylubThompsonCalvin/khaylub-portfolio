// The phoenix rises from the sea of clouds the way it rises from ashes (the
// bird is the rebirth motif): it bursts up out of the clouds beating hard with an ember trail, glides a wide banked
// arc in the light, skims the cloud tops, dives back in, and rises again. One cycle is about 30 s.
import * as THREE from 'three';

// the path: from under the cloud floor, up, around, and back down into the sea (metres; the camera looks toward -Z)
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(200, -40, -520), new THREE.Vector3(190, -4, -500), new THREE.Vector3(165, 34, -455),
  new THREE.Vector3(105, 66, -390), new THREE.Vector3(10, 78, -340), new THREE.Vector3(-95, 66, -330),
  new THREE.Vector3(-185, 44, -385), new THREE.Vector3(-225, 24, -470), new THREE.Vector3(-175, 11, -555),
  new THREE.Vector3(-80, 9, -600), new THREE.Vector3(-55, 4, -545), new THREE.Vector3(-30, -40, -505),   // dives into open cloud, west of the near peak (it used to fly into it)
], false, 'centripetal');
const LEN = PATH.getLength();
const HIDDEN = 5;                                  // seconds under the clouds before the next rise

function speedAt(u, climb) {
  // slow and labouring while climbing, fast in the dive, easy in the glide
  return THREE.MathUtils.clamp(24 - climb * 30, 13, 34);
}

const EMBER_VERT = /* glsl */ `
  attribute float aLife; attribute float aSize; varying float vLife;
  void main() { vLife = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * (300.0 / -mv.z), 18.0) * clamp(aLife, 0.0, 1.0); gl_Position = projectionMatrix * mv; }`;
const EMBER_FRAG = /* glsl */ `
  varying float vLife; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vLife <= 0.0) discard;
    vec3 c = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.82, 0.45), clamp(vLife, 0.0, 1.0));
    gl_FragColor = vec4(c, smoothstep(0.5, 0.0, d) * clamp(vLife, 0.0, 1.0)); }`;

// options (the Summit passes none and keeps the flight above): path, a THREE.Curve in the group's own space, flown the
// same way (pitch, bank, wing beats, embers) and repeated after `hidden` seconds out of sight
export function createPhoenixFlight(gltf, { path = PATH, hidden = HIDDEN } = {}) {
  const len = path === PATH ? LEN : path.getLength();
  const bird = gltf.scene;
  const box = new THREE.Box3().setFromObject(bird);
  bird.scale.setScalar(11 / box.getSize(new THREE.Vector3()).x);      // about an 11 m wingspan
  // the model is posed rearing upright (its spine points about 61 degrees above its +Z); turned so the beak leads
  // along the holder's +Z (what lookAt aims), then pitched forward by `pitch` so the spine follows the flight path
  const holder = new THREE.Group(), pitch = new THREE.Group();
  holder.add(pitch); pitch.add(bird);
  bird.rotation.y = -Math.PI / 2;
  const LEVEL = 1.06;                                              // rad: spine along the path
  // Wings are driven here, not by the file's 0.7 s clip (owner 2026-10-08: it "pumps" with the head dipping).
  // It flies like an eagle (owner 2026-10-09): mostly soaring on broad, still wings held in a shallow V, the primary
  // feathers spread like fingers; slow, deep beats only to climb, a short burst now and then to hold height; small
  // gust corrections in the glide; wings drawn in for the dive. The tail is the rudder: fanned wide when climbing or
  // turning, folded narrow in the dive, twisted and swung into every turn. The head is held steady.
  const bones = {};
  bird.traverse((o) => { if (o.isBone) bones[o.name] = o; if (o.isSkinnedMesh) o.frustumCulled = false; });
  // The rig (measured 2026-10-09, model frame: +x forward, +y up): FOUR wings. The front pair are the bone_8 (right)
  // and bone_22 (left) chains off the chest, about 7.5 m out each side, primaries on bone_12..18 and bone_26..32. The
  // back pair, smaller, hang off the hips (bone_70): bone_88 (right) and bone_98 (left). The tail is bone_70: the long
  // centre streamer Tail_0..Tail_8 and two side feathers, bone_80 (right) and bone_83 (left), which fan. The "Limb"
  // chains are the legs and talons.
  const pick = (names) => names.map((n) => bones[n]).filter(Boolean);
  const WINGS = [
    // [key, side, chain from the root outward, tip bone, primaries, share of the stroke, lag behind the front pair]
    ['FR', 'R', pick(['bone_8', 'bone_9', 'bone_10', 'bone_11']), bones.bone_13, pick(['bone_12', 'bone_14', 'bone_16', 'bone_18']), 1, 0],
    ['FL', 'L', pick(['bone_22', 'bone_23', 'bone_24', 'bone_25']), bones.bone_27, pick(['bone_26', 'bone_28', 'bone_30', 'bone_32']), 1, 0],
    ['BR', 'R', pick(['bone_88', 'bone_90', 'bone_95']), bones.bone_97, pick(['bone_91', 'bone_93']), 0.85, 0.12],
    ['BL', 'L', pick(['bone_98', 'bone_100', 'bone_105']), bones.bone_107, pick(['bone_101', 'bone_103']), 0.85, 0.12],
  ].filter((w) => w[2].length && w[3]);
  const legs = Object.keys(bones).filter((n) => /(Left|Right)_Limb_0$/.test(n)).map((n) => bones[n]);
  const tail = Object.keys(bones).filter((n) => /Tail_[0-9]+$/.test(n)).sort((x, y) => Number(x.match(/([0-9]+)$/)[1]) - Number(y.match(/([0-9]+)$/)[1])).map((n) => bones[n]);
  const fan = [[bones.bone_80, bones.bone_82], [bones.bone_83, bones.bone_85]].filter(([b, t]) => b && t);
  const neck = bones.Head_0, skull = bones.Head_2, beak = bones.Head_3;
  const rest = new Map(Object.values(bones).map((b) => [b, b.quaternion.clone()]));
  const sign = new Map(), restTip = new Map();
  let calibrated = false;
  const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _ax = new THREE.Vector3(), _hq = new THREE.Quaternion();
  const FWD = new THREE.Vector3(), UPW = new THREE.Vector3(), SIDE = new THREE.Vector3();

  // rotate a bone about world axes, on top of its rest pose; several turns compose (the first is applied last)
  function turn(b, ...pairs) {
    b.parent.getWorldQuaternion(_pq).invert();
    b.quaternion.copy(rest.get(b));
    for (let i = pairs.length - 2; i >= 0; i -= 2) {
      _ax.copy(pairs[i]).applyQuaternion(_pq).normalize();
      b.quaternion.premultiply(_q.setFromAxisAngle(_ax, pairs[i + 1]));
    }
  }
  function local(b) { return holder.worldToLocal(b.getWorldPosition(new THREE.Vector3())); }
  function tipHeight(root, tip) {                     // tip above the root, as an angle in the bird's own frame
    holder.updateMatrixWorld(true);
    const a = local(root), t = local(tip);
    return Math.atan2(t.y - a.y, Math.hypot(t.x - a.x, t.z - a.z));
  }
  function frame() {
    holder.updateMatrixWorld(true); holder.getWorldQuaternion(_hq);
    FWD.set(0, 0, 1).applyQuaternion(_hq); UPW.set(0, 1, 0).applyQuaternion(_hq); SIDE.set(1, 0, 0).applyQuaternion(_hq);
  }
  // which way is "up" for each wing and "outward" for each fan feather is measured once, not assumed from the file
  function calibrate() {
    frame();
    for (const [key, , chain, tip] of WINGS) {
      restTip.set(key, tipHeight(chain[0], tip));
      turn(chain[0], FWD, 0.3); sign.set(key, tipHeight(chain[0], tip) > restTip.get(key) ? 1 : -1);
      chain[0].quaternion.copy(rest.get(chain[0]));
    }
    for (const [b, t] of fan) {
      holder.updateMatrixWorld(true); const x0 = Math.abs(local(t).x);
      turn(b, UPW, 0.3); holder.updateMatrixWorld(true); sign.set(b, Math.abs(local(t).x) > x0 ? 1 : -1);
      b.quaternion.copy(rest.get(b));
    }
    for (const b of [neck, skull]) {                  // which turn of the neck and of the skull lifts the beak
      if (!b || !beak) continue;
      holder.updateMatrixWorld(true); const y0 = beak.getWorldPosition(new THREE.Vector3()).y;
      turn(b, SIDE, 0.3); holder.updateMatrixWorld(true);
      sign.set(b, beak.getWorldPosition(new THREE.Vector3()).y > y0 ? 1 : -1);
      b.quaternion.copy(rest.get(b));
    }
    // the tail's segment lengths, so the trail spaces them as they are built
    holder.updateMatrixWorld(true);
    for (let i = 0; i + 1 < tail.length; i++) segLen.push(tail[i].getWorldPosition(new THREE.Vector3()).distanceTo(tail[i + 1].getWorldPosition(new THREE.Vector3())));
    calibrated = true;
  }
  // the head stays up (owner 2026-10-09): whatever the body does, the head is held so the skull (Head_2 to Head_3,
  // the part that reads as the face; the neck below it curves up, then the skull hooks down) points level, the way a
  // bird holds its gaze steady. The neck base takes 40% of the correction and the skull the rest, so it never cranes.
  const _bf = new THREE.Vector3(), _nb = new THREE.Vector3();
  function skullPitch() {
    holder.updateMatrixWorld(true);
    _bf.copy(beak.getWorldPosition(_bf)).sub(skull.getWorldPosition(_nb)).normalize();
    return Math.asin(THREE.MathUtils.clamp(_bf.y, -1, 1));
  }
  function holdHead() {
    if (!neck || !skull || !beak) return;
    neck.quaternion.copy(rest.get(neck)); skull.quaternion.copy(rest.get(skull));
    const want = deg(2);
    const need = THREE.MathUtils.clamp(want - skullPitch(), deg(-60), deg(90));
    turn(neck, SIDE, sign.get(neck) * need * 0.4);
    turn(skull, SIDE, sign.get(skull) * THREE.MathUtils.clamp(want - skullPitch(), deg(-60), deg(70)));
  }

  // the tail follows the flight path like a kite's tail (owner 2026-10-09: "as if steering"): each segment aims at
  // where the tail root was a moment ago, so it curves into every turn and bends through the climb and the descent;
  // a small ripple keeps it alive. The history is the tail root's own recent path, sampled every 5 cm.
  const segLen = [], trail = [];                     // trail: newest first, { p, d } with d the distance behind
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _w = new THREE.Quaternion(), _r = new THREE.Quaternion();
  function trailPoint(dist, out) {
    if (trail.length < 2) return null;
    for (let i = 1; i < trail.length; i++) {
      if (trail[i].d >= dist) { const a = trail[i - 1], b = trail[i]; return out.lerpVectors(a.p, b.p, (dist - a.d) / Math.max(1e-6, b.d - a.d)); }
    }
    return null;
  }
  function recordTrail() {
    holder.updateMatrixWorld(true);
    const p = tail[0].getWorldPosition(new THREE.Vector3());
    if (trail.length && p.distanceTo(trail[0].p) > 6) trail.length = 0;          // it jumped (a new rise): start over
    if (trail.length && p.distanceTo(trail[0].p) < 0.05) { trail[0].p.copy(p); return; }
    const step = trail.length ? p.distanceTo(trail[0].p) : 0;
    for (const q of trail) q.d += step;
    trail.unshift({ p, d: 0 });
    const keep = segLen.reduce((x, y) => x + y, 0) * 1.5 + 2;
    while (trail.length > 2 && trail[trail.length - 2].d > keep) trail.pop();
  }
  function steerTail(time) {
    recordTrail();
    let along = 0;
    for (let i = 0; i + 1 < tail.length; i++) {
      const b = tail[i], c = tail[i + 1];
      b.quaternion.copy(rest.get(b)); b.updateMatrixWorld(true);
      along += segLen[i];
      if (!trailPoint(along, _t)) return;            // not enough history yet: the rest pose stands in
      // ripple: a slow sideways wave that grows toward the tip
      _t.addScaledVector(SIDE, Math.sin(time * 2.2 - i * 0.7) * 0.06 * i);
      b.getWorldPosition(_a); c.getWorldPosition(_b);
      _d.subVectors(_b, _a).normalize();
      _t.sub(_a).normalize();
      _r.setFromUnitVectors(_d, _t);                  // world turn that swings this segment onto the trail
      b.parent.getWorldQuaternion(_w);
      b.quaternion.premultiply(_w.clone().invert().multiply(_r).multiply(_w));
    }
  }

  const deg = THREE.MathUtils.degToRad;
  let phase = 0, wFlap = 0, burst = 0, glideFor = 2, spread = 0.5;
  function strokeAngle(f) {                           // wing dihedral over one beat (f 0..1), in radians
    if (f < 0.45) { const k = f / 0.45; return deg(38 - 70 * (0.5 - 0.5 * Math.cos(Math.PI * k))); }   // downstroke
    const k = (f - 0.45) / 0.55; return deg(-32 + 70 * (0.5 - 0.5 * Math.cos(Math.PI * k)));            // upstroke
  }
  function animateWings(dt, climb, time, turnRate) {
    // when to beat: steady deep beats on the climb; on the level, a burst of two beats after a long soar; never in
    // the dive
    let want;
    if (climb > 0.18) want = 1;
    else if (climb < -0.12) want = 0;
    else if (glideFor > 0) { glideFor -= dt; want = 0; }
    else want = 1;
    const period = climb > 0.18 ? 1.15 : 1.3;
    const before = phase;
    if (wFlap > 0.02 || want) phase = (phase + dt / period) % 1;
    if (phase < before && want && climb <= 0.18 && climb >= -0.12 && ++burst >= 2) { burst = 0; glideFor = 5 + Math.random() * 3; }
    wFlap += ((want ? 1 : 0) - wFlap) * Math.min(1, dt * 2.5);
    // soaring: a shallow V with small, slow gust corrections; drawn down and in for the dive
    const dive = THREE.MathUtils.smoothstep(-climb, 0.12, 0.45);
    const gust = deg(2.2) * (Math.sin(time * 0.9) * 0.6 + Math.sin(time * 2.3 + 1.1) * 0.4);
    const glideAng = THREE.MathUtils.lerp(deg(8) + gust, deg(-14), dive);
    frame();
    for (const [key, , chain, , primaries, share, lagBehind] of WINGS) {
      const f = (phase - lagBehind + 1) % 1;          // the back pair follow the front a beat behind
      const a = THREE.MathUtils.lerp(glideAng, strokeAngle(f) * share, wFlap);
      const s = sign.get(key);
      // the shoulder takes the stroke (relative to the model's own resting wing); outer bones lag and flex
      turn(chain[0], FWD, s * (a - restTip.get(key)));
      for (let i = 1; i < chain.length; i++) {
        const lag = THREE.MathUtils.lerp(glideAng, strokeAngle((f - 0.07 * i + 1) % 1) * share, wFlap) - a;
        // in the glide the outer wing curls up a little at the tip, the way an eagle's does under load
        turn(chain[i], FWD, s * (lag * 0.4 + deg(3) * i * (1 - wFlap) * (1 - dive)));
      }
      // fingers: the primaries splay apart and lift in the soar, close up in the beat and the dive
      const finger = (1 - wFlap * 0.7) * (1 - dive);
      primaries.forEach((p, i) => {
        const fanOut = (i - (primaries.length - 1) / 2) * deg(5) * finger;
        turn(p, UPW, fanOut, FWD, s * deg(4) * finger);
      });
    }
    // legs tucked back along the body, talons held still: strong, not dangling (owner 2026-10-08)
    legs.forEach((b) => turn(b, SIDE, deg(95)));
    holdHead();
    // tail: the side feathers fan wide to climb or turn and fold narrow to dive; the long streamer follows the path
    const wantSpread = THREE.MathUtils.clamp(0.35 + Math.max(0, climb) * 2 + Math.abs(turnRate) * 1.5 - dive * 0.6, 0, 1);
    spread += (wantSpread - spread) * Math.min(1, dt * 2);
    for (const [b] of fan) turn(b, UPW, sign.get(b) * deg(6 + 26 * spread), SIDE, deg(6) * spread);
    steerTail(time);
    return Math.sin(2 * Math.PI * phase) * 0.35 * wFlap;                // body lift on the downstroke (m)
  }
  let clock = 0;

  // ember trail
  const N = 260;
  const pos = new Float32Array(N * 3), life = new Float32Array(N), size = new Float32Array(N), vel = new Float32Array(N * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const embers = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  embers.frustumCulled = false;
  let next = 0;

  const group = new THREE.Group(); group.add(holder); group.add(embers);
  let s = 0, hiddenFor = 0, roll = 0;
  const prevT = new THREE.Vector3(0, 0, -1);
  const T = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  function emit(at, n, spread) {
    for (let k = 0; k < n; k++) {
      const i = next; next = (next + 1) % N;
      pos.set([at.x + (Math.random() - 0.5) * spread, at.y + (Math.random() - 0.5) * spread, at.z + (Math.random() - 0.5) * spread], i * 3);
      vel.set([(Math.random() - 0.5) * 2, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 2], i * 3);
      life[i] = 1.6 + Math.random() * 1.2; size[i] = 1.5 + Math.random() * 2.5;
    }
  }

  function update(dt) {
    // embers drift up and fade
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt * 0.9;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    g.attributes.position.needsUpdate = true; g.attributes.aLife.needsUpdate = true; g.attributes.aSize.needsUpdate = true;

    if (hiddenFor > 0) { hiddenFor -= dt; holder.visible = false; return; }
    clock += dt;
    holder.visible = true;
    const u = Math.min(s / len, 1);
    path.getPointAt(u, P); path.getTangentAt(u, T);
    const climb = T.y;                                          // -1 straight down .. 1 straight up
    s += speedAt(u, climb) * dt;
    if (s >= len) { s = 0; hiddenFor = hidden; }

    holder.position.copy(P);
    // pitch follows the path, but never noses down steeper than about 20 degrees: it glides down, it doesn't plunge
    const aim = T.clone(); aim.y = Math.max(aim.y, -0.35 * Math.hypot(aim.x, aim.z)); aim.normalize();
    holder.lookAt(P.clone().add(aim));
    // bank into the turn: roll from how fast the heading swings
    const h0 = Math.atan2(prevT.x, -prevT.z), h1 = Math.atan2(T.x, -T.z);
    let dh = h1 - h0; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
    const turnRate = dh / Math.max(dt, 1e-3);                     // radians per second, + to the left
    // eagles bank steeply in a soaring turn (30 to 45 degrees), and a little gust rocks the wings in the glide
    const target = THREE.MathUtils.clamp(-turnRate * 1.1, -0.8, 0.8) + 0.04 * Math.sin(clock * 0.7);
    roll += (target - roll) * Math.min(1, dt * 2.5);
    holder.rotateZ(roll);
    // a little more upright while it rises out of the clouds (the rearing phoenix), flat in the glide and the dive
    pitch.rotation.x += ((LEVEL - 0.5 * Math.max(0, climb)) - pitch.rotation.x) * Math.min(1, dt * 3);
    prevT.copy(T);

    if (!calibrated) calibrate();
    const lift = animateWings(dt, climb, clock, turnRate);
    holder.position.addScaledVector(UPW, lift);
    // embers: a burst as it breaks out of the clouds, a thin trail while it climbs
    if (P.y > -6 && P.y < 14 && climb > 0.3) emit(P, 6, 4);
    else if (climb > 0.15) emit(P, 1, 2);
  }

  // focus: the body's middle (a spine bone); the holder's origin sits metres away from it, at the model's root
  // restart: back to the start of the path at once (a stage that shows the flight from its beginning on each arrival)
  // (the heading, bank and clock start fresh too, so the first frame does not bank toward wherever it last flew)
  function restart() { s = 0; hiddenFor = 0; trail.length = 0; life.fill(0); path.getTangentAt(0, prevT); roll = 0; clock = 0; }
  return { group, update, restart, holder, focus: bones.Spine_1 || holder };
}
