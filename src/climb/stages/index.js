// index.js: one loader per stage; real stages replace their placeholder (Phase 3 onward).
//
// The stage interface (Ruling 9). A stage module exports build(ctx), where
//   ctx = { scene, renderer, camera, anchor, lights, wanderer, quality, still, requestDraw }
//   anchor = a copy of that stage's STAGE_ANCHORS entry from ../path.js: { centre, cam, look }, THREE.Vector3s in world
//            space. Treat it as read-only information (the real anchors are frozen; tune them in path.js itself).
//   Stage i is centred at x 0, z -i * 600, ground at y 0; build everything relative to anchor.centre.
//   lights = 2 THREE.PointLights (intensity 0) the stage may set: position (WORLD space), color, intensity, distance,
//            decay. Do NOT add them to the scene: the world owns a fixed pool of point lights and copies this stage's
//            values onto it while the stage is shown (all zero otherwise), and they are simply dropped on dispose.
//   wanderer = read-only { get position() }: where the Wanderer stands now, a fresh THREE.Vector3 on each read (NaN until he has
//            loaded), so a stage can aim one of its ctx.lights at him (for example a soft rim or moon light on his back).
//            Per frame, prefer copyPosition(out) (fills out, no allocation; NaN until he has loaded).
//   quality  = read-only, the render loop's current quality scale (1 full, never below 0.35: renderLoop.js nextQuality;
//            a software renderer starts at 0.5 in still mode); below 0.7 a stage should draw less
//            (for example fewer instances, through InstancedMesh.count, which needs no recompile). Read it in update.
//   still    = read-only, true while motion is off (reduced motion, Pause motion, or a software renderer): frames are drawn only
//            on request, so a stage should hold its animation (no time advance) and show a composed still moment.
//   requestDraw() asks for one more frame: in still mode, call it when something arrives late (a model that loaded after
//            the stage was shown), or the still picture waits for the next scroll to show it.
// THE WANDERER (src/climb/wanderer.js) is world-level: one instance the world moves between stages; a stage never builds him.
//   He walks on the ground, 1.8 m tall, facing -z, at the depth of a fixed SCREEN point: wide screens x 0.34, y -0.36 (NDC),
//   portrait x 0.12, y -0.3, 6 to 60 m from the camera (his x is that point's, or the trail's centre with pathAt below). So the ground must be visible at that point: when you retune an anchor in
//   path.js, keep that point below the horizon (a camera low and close to the ground, looking a little down, works). He is
//   hidden while the camera is in transit between stages. He costs about 33 draw calls of the stage's 150 budget while he is
//   shown. He has a faint built-in fill (emissive, no light is added), so he is never a pure silhouette.
//   Optional extras on the object build returns:
//     groundAt(x, z) -> y   the terrain height at a world position; his feet follow it while this stage is shown (default 0).
//     pathAt(z) -> x        the WORLD x of the centre line of the trail he walks, at world depth z. When a stage gives it, his
//                           depth still comes from the screen point above (and the walk), and his x follows pathAt(z) (eased
//                           over about a third of a second, snapped at a hidden change of stage), so his feet sit on the trail's
//                           centre line. Draw the trail from the same function, keep props beside it (not on it), and tune the
//                           anchor so the trail runs up the middle of the frame above the caption. Every real stage gives one.
//     wanderer: { hide: true }               this stage does not want him; or
//     wanderer: { offset: { x, z } }         metres added to where he would stand (move him out of a shot); added after pathAt.
// LIGHTS RULE: a stage must never add its own lights to the scene or its group. The warm-up compiles with the scene's
// lights, and a light that appears with the stage changes the light count, which recompiles every lit material and
// brings back the first-sight hitch. Use ctx.lights, emissive materials, or baked / vertex-colour lighting instead.
// build may be async. It returns (or resolves to) { group, update?(dt, local), dispose() }:
//   group    a THREE.Object3D the stage has added to the scene. The world hides it until its shaders are compiled
//            (renderer.compileAsync) and its textures uploaded, then shows it only while the camera is at this stage.
//   update   called each frame once the stage is ready; local is 0..1 through this stage's slice of the scroll
//            (0.5 at the stage's middle, where the camera sits on anchor.cam looking at anchor.look).
//   dispose  removes the group from the scene and frees its geometry, materials and textures.
// A loader that rejects or a build that throws is logged and retried later; the sky and the clouds carry on meanwhile.
import { placeholder } from './placeholder.js';
// real stages load as their own chunk (dynamic import), so a stage's code downloads only when the journey nears it
const REAL = { 0: () => import('./the-ordinary-world.js'), 1: () => import('./the-call.js'), 2: () => import('./the-threshold.js'), 3: () => import('./the-trials.js'), 4: () => import('./the-ordeal.js'), 5: () => import('./the-harvest.js') };
export const STAGE_LOADERS = [0, 1, 2, 3, 4, 5].map((i) => REAL[i] || (() => Promise.resolve(placeholder(i))));
