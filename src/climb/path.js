// The Climb's camera path, shared by the world and every stage. Pure math (three's Vector3 only), unit tested.
// Stage i is centred at x 0, z -i * SPACING, ground at y 0. At each stage's middle (progress (i + 0.5) / 6) the camera sits
// exactly on that stage's anchor (and rests there from local 0.25 to 0.75); between two stages it travels forward while
// rising over the cloud sea (y about 70 at the halfway point, above CLOUD_TOP), so the cloud veil hides each change of set. Before stage 1's middle it descends from
// above the clouds (the landing view); after stage 6's middle it holds still, then settles onto the sky at the very end (END_*).
import * as THREE from 'three';

export const SPACING = 600;
export const LIFT = 64;          // how far above the anchors the camera rises at the halfway point between two stages
export const CLOUD_TOP = 44;     // the top of the cloud sea while the camera is above it
export const DWELL = 0.25;       // the share of each stage, either side of its middle, where the camera rests on the anchor

const v = (x, y, z) => new THREE.Vector3(x, y, z);
// per stage: centre (the stage's own origin), cam (camera at the stage's middle) and look (what it looks at), world space.
// THE WANDERER stands at the depth of a fixed screen point (wide x 0.34, y -0.36; portrait x 0.12, y -0.3, NDC), on the
// centre line of the stage's trail (its pathAt), so set cam.x near the trail's x a dozen metres ahead (he then walks up the
// middle of the frame, on a phone too); a retuned cam and look must keep that point below the horizon (ground visible
// there) or he is placed at a clamped 6 to 60 m and may leave the frame; the behaviour suite checks him at every stage middle. He costs about 33 of a stage's 150 draw calls.
// See the header of stages/index.js for the full contract (groundAt, wanderer.hide / offset, ctx.wanderer).
// A stage task may tune its own cam and look HERE, in the source; at run time the anchors are read-only (frozen), and
// stages get clones (ctx.anchor), so nothing can move the path by accident.
const freeze = (o) => { Object.values(o).forEach(Object.freeze); return Object.freeze(o); };
// stage 6 (The Harvest): the camera stands in the wheat, eyes just above the heads (1.5 m), looking 2 degrees down, so the
// field fills the lower half and the low sun sits above the horizon at the middle of the frame.
// stage 1 (The Ordinary World): eye height in the desert, looking 1 degree down, so the saguaros and the moon stand against the
// stars, the trail runs up the middle of the frame and the trail post stands beside it, at the Wanderer's left.
// stage 2 (The Call): eyes at standing height (1.7 m) at the edge of the camp's clearing, over the trodden path (a little
// left of it, so the fire stays in a phone's frame), looking a little down and left past the fire toward the trees, so the
// forest wall and the sky over it fill the upper half.
// stage 3 (The Threshold): eyes at 1.7 m, just left of the middle of the stone path (the arch's opening spans x -1.5 to 1.5, so the
// camera passes through it as the set slides by during the stage), looking about 1 degree down along the path to the river.
// stage 4 (The Trials): the camera stands on the crest of the ridge where the fixed line starts (over the path on the spine),
// eyes 2 m up, looking almost level up the spine, so the ridge climbs away ahead into the cloud and the valleys fall away either side.
// stage 5 (The Ordeal): eyes at 2.4 m on the plateau, looking 2 degrees down, so the snowfield, the edge, the cloud sea
// beyond it and the red line on the horizon share the frame and the phoenix has the sky above.
const TUNED = { 0: { cam: [0, 1.8, 40], look: [0, 1.25, 8] }, 1: { cam: [1.3, 1.7, 40], look: [0.9, 1.0, 8] }, 2: { cam: [-0.3, 1.7, 40], look: [-0.3, 1.15, 8] }, 3: { cam: [1.5, 2.0, 40], look: [2.1, 1.1, 8] }, 4: { cam: [0, 2.4, 40], look: [0, 1.0, 0] }, 5: { cam: [0, 1.5, 40], look: [0, 0.4, 8] } };
export const STAGE_ANCHORS = Object.freeze([0, 1, 2, 3, 4, 5].map((i) => {
  const z = -i * SPACING, t = TUNED[i];
  return freeze({ centre: v(0, 0, z), cam: t ? v(t.cam[0], t.cam[1], z + t.cam[2]) : v(0, 3, z + 40), look: t ? v(t.look[0], t.look[1], z + t.look[2]) : v(0, 0.6, z + 8) });
}));
// the ending, at the bottom of the page: the camera rises a little over the wheat and settles on the golden sky, so the final
// frame is an arrival, not a pause. Wide screens lift the gaze (END_LOOK) and turn a little left (END_YAW, so the sun's core
// sits right of the caption); portrait screens, where the caption rides up to the middle at the bottom of the page, lower it
// (END_LOOK_PORTRAIT) so the sun and the tree sit in the upper third, above the caption. The world drives it from the real
// scroll left to the bottom (cameraAt's `ending`); without one it falls back to the last stage's local END_FROM to END_TO.
export const END_FROM = 0.76, END_TO = 0.87, END_RISE = 0.7, END_LOOK = 4, END_YAW = -2.4, END_RISE_PORTRAIT = 1.2, END_LOOK_PORTRAIT = -5.6;
export const anchorCopy = (i) => ({ centre: STAGE_ANCHORS[i].centre.clone(), cam: STAGE_ANCHORS[i].cam.clone(), look: STAGE_ANCHORS[i].look.clone() });
// the landing: one virtual anchor a stage-length before stage 1, so progress 0 sits high above the clouds
const BEFORE = { cam: STAGE_ANCHORS[0].cam.clone().add(v(0, 0, SPACING)), look: STAGE_ANCHORS[0].look.clone().add(v(0, 0, SPACING)) };

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);

// cameraAt(progress, out): fills out.pos and out.look (THREE.Vector3) and sets out.lift (0 on an anchor, 1 at the top of a
// transit), out.from / out.to (the stages either side), out.mix (0..1 from one to the other, eased) and out.end (0..1, the
// closing settle at the bottom of the page). ending (optional) = { t: 0..1 through the last stretch of scroll to the bottom,
// portrait: boolean }; it counts only past the last stage's middle. Returns out.
export function cameraAt(progress, out, ending = null) {
  const n = STAGE_ANCHORS.length;
  let k = Math.min(clamp01(progress) * n, n - 0.5) - 0.5;   // -0.5 .. n - 1, in anchor units
  let a = Math.floor(k), u = k - a;
  if (a >= n - 1) { a = n - 2; u = 1; }
  // dwell: the camera holds each anchor for DWELL anchor-units either side of the middle (local 0.25 to 0.75, while the
  // stage's section fills the screen; a rail jump or deep link lands at about local 0.31) and travels in between
  u = Math.min(1, Math.max(0, (u - DWELL) / (1 - 2 * DWELL)));
  const A = a < 0 ? BEFORE : STAGE_ANCHORS[a], B = STAGE_ANCHORS[a + 1];
  const e = smoother(u), s = Math.sin(Math.PI * u), lift = u > 0 && u < 1 ? s * s : 0;
  out.pos.lerpVectors(A.cam, B.cam, e); out.pos.y += LIFT * lift;
  out.look.lerpVectors(A.look, B.look, e); out.look.y += LIFT * lift * 0.9;
  out.lift = lift; out.from = Math.max(0, a); out.to = a + 1; out.mix = a < 0 ? 1 : e;
  const local = clamp01(progress) * n - (n - 1);
  const raw = ending ? (local > 0.5 ? clamp01(ending.t) : 0) : clamp01((local - END_FROM) / (END_TO - END_FROM));
  const end = smoother(raw), portrait = !!ending?.portrait;
  out.pos.y += (portrait ? END_RISE_PORTRAIT : END_RISE) * end;
  out.look.y += (portrait ? END_LOOK_PORTRAIT : END_LOOK) * end;
  if (!portrait) out.look.x += END_YAW * end;
  out.end = end;
  return out;
}

// the cloud sea's top for a given lift: under the ground on an anchor, rising past the camera early in a transit (the veil),
// then settling at CLOUD_TOP while the camera crosses above it
export const cloudTopAt = (lift) => Math.min(CLOUD_TOP, -10 + 130 * lift);
