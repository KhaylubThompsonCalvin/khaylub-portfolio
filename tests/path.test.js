import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { STAGE_ANCHORS, cameraAt, CLOUD_TOP, cloudTopAt, END_FROM, END_TO, END_RISE, END_LOOK, END_YAW, END_RISE_PORTRAIT, END_LOOK_PORTRAIT } from '../src/climb/path.js';
const mk = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const N = STAGE_ANCHORS.length;
describe('path', () => {
  it('six anchors: stage i centred at x 0, z -i*600, ground y 0', () => {
    expect(N).toBe(6);
    STAGE_ANCHORS.forEach((a, i) => { expect(a.centre.toArray()).toEqual([0, 0, -i * 600]); expect(a.cam).toBeInstanceOf(THREE.Vector3); expect(a.look).toBeInstanceOf(THREE.Vector3); });
  });
  it('sits exactly on each anchor at the stage middle', () => {
    STAGE_ANCHORS.forEach((a, i) => {
      const o = cameraAt((i + 0.5) / N, mk());
      expect(o.pos.distanceTo(a.cam)).toBeLessThan(1e-6); expect(o.look.distanceTo(a.look)).toBeLessThan(1e-6);
    });
  });
  it('holds the anchor while the stage fills the screen (local 0.25 to 0.75; a rail jump lands at about 0.31)', () => {
    STAGE_ANCHORS.forEach((a, i) => {
      for (const local of [0.26, 0.31, 0.69, 0.74]) {
        const o = cameraAt((i + local) / N, mk());
        expect(o.pos.distanceTo(a.cam)).toBeLessThan(1e-6); expect(o.lift).toBe(0);
      }
    });
  });
  it('is continuous: no jump anywhere, including either side of each anchor', () => {
    const a = mk(), b = mk(); let worst = 0;
    cameraAt(0, a);
    for (let k = 1; k <= 12000; k++) {
      cameraAt(k / 12000, b);
      worst = Math.max(worst, a.pos.distanceTo(b.pos), a.look.distanceTo(b.look));
      a.pos.copy(b.pos); a.look.copy(b.look);
    }
    expect(worst).toBeLessThan(2);   // 600 m per stage at 12000 samples: about 1.1 m a step at the fastest
    for (let i = 0; i < N; i++) {
      const m = (i + 0.5) / N, e = 1e-7;
      expect(cameraAt(m - e, mk()).pos.distanceTo(cameraAt(m + e, mk()).pos)).toBeLessThan(1e-3);
    }
  });
  it('the ending: after the last dwell the camera rises a little and lifts its gaze to the sky, smoothly', () => {
    const last = STAGE_ANCHORS[N - 1];
    const at = (local) => cameraAt((N - 1 + local) / N, mk());
    expect(at(END_FROM).pos.distanceTo(last.cam)).toBeLessThan(1e-6);
    const f = at(END_TO);
    expect(f.end).toBeCloseTo(1); expect(f.pos.y - last.cam.y).toBeCloseTo(END_RISE); expect(f.look.y - last.look.y).toBeCloseTo(END_LOOK);
    const pitch = (o) => Math.atan2(o.look.y - o.pos.y, Math.hypot(o.look.x - o.pos.x, o.look.z - o.pos.z));
    expect(pitch(f)).toBeGreaterThan(pitch(at(0.5)));   // looking higher than at the middle
    expect(pitch(f)).toBeGreaterThan(0);                // above the horizon: the sky holds the frame
    for (let i = 0; i < N - 1; i++) expect(cameraAt((i + 0.9) / N, mk()).end).toBe(0);
  });
  it('the ending from the real scroll: wide screens lift and turn left, portrait screens lower the gaze; nothing before the last middle', () => {
    const last = STAGE_ANCHORS[N - 1], p = (N - 0.2) / N;
    const pitch = (o) => Math.atan2(o.look.y - o.pos.y, Math.hypot(o.look.x - o.pos.x, o.look.z - o.pos.z));
    const none = cameraAt(p, mk(), { t: 0, portrait: false });
    expect(none.pos.distanceTo(last.cam)).toBeLessThan(1e-6); expect(none.end).toBe(0);   // the fixed local window is not used
    const wide = cameraAt(p, mk(), { t: 1, portrait: false }), tall = cameraAt(p, mk(), { t: 1, portrait: true });
    expect(wide.pos.y - last.cam.y).toBeCloseTo(END_RISE); expect(wide.look.y - last.look.y).toBeCloseTo(END_LOOK); expect(wide.look.x - last.look.x).toBeCloseTo(END_YAW);
    expect(END_YAW).toBeLessThan(0); expect(pitch(wide)).toBeGreaterThan(pitch(none));
    expect(tall.pos.y - last.cam.y).toBeCloseTo(END_RISE_PORTRAIT); expect(tall.look.y - last.look.y).toBeCloseTo(END_LOOK_PORTRAIT); expect(tall.look.x).toBeCloseTo(last.look.x);
    expect(pitch(tall)).toBeLessThan(pitch(none));
    for (let i = 0; i < N - 1; i++) expect(cameraAt((i + 0.6) / N, mk(), { t: 1, portrait: false }).end).toBe(0);
    const half = cameraAt(p, mk(), { t: 0.5, portrait: false }); expect(half.end).toBeCloseTo(0.5);
  });
  it('the harvest camera stands in the wheat: eyes 1.2 to 1.6 m up, looking a little down at the middle', () => {
    const a = STAGE_ANCHORS[N - 1];
    expect(a.cam.y).toBeGreaterThanOrEqual(1.2); expect(a.cam.y).toBeLessThanOrEqual(1.6); expect(a.look.y).toBeLessThan(a.cam.y);
  });
  it('the call camera stands at the camp at eye height (1.5 to 1.9 m), looking a little down', () => {
    const a = STAGE_ANCHORS[1];
    expect(a.cam.y).toBeGreaterThanOrEqual(1.5); expect(a.cam.y).toBeLessThanOrEqual(1.9); expect(a.look.y).toBeLessThan(a.cam.y);
  });
  it('rises above the cloud sea (y above 40) between stages', () => {
    for (let i = 0; i < N - 1; i++) {
      const o = cameraAt((i + 1) / N, mk());
      expect(o.pos.y).toBeGreaterThan(40); expect(o.pos.y).toBeGreaterThan(CLOUD_TOP);
      expect(o.lift).toBeCloseTo(1);
    }
    expect(cameraAt(0.5 / N, mk()).lift).toBe(0);
  });
  it('clamps outside 0..1 and reports the mood pair', () => {
    const o = cameraAt(-1, mk()); expect(Number.isFinite(o.pos.y)).toBe(true);
    const e = cameraAt(2, mk()); expect(e.pos.distanceTo(STAGE_ANCHORS[N - 1].cam.clone().add(new THREE.Vector3(0, END_RISE, 0)))).toBeLessThan(1e-6);
    const m = cameraAt(2.25 / N, mk()); expect(m.from).toBe(1); expect(m.to).toBe(2); expect(m.mix).toBeGreaterThan(0.5);
  });
  it('the cloud sea is under the ground on an anchor and under the camera at the top of a transit', () => {
    expect(cloudTopAt(0)).toBeLessThan(0);
    expect(cloudTopAt(1)).toBe(CLOUD_TOP);
    let inside = false;   // somewhere on the way up the camera passes through the sea (the veil)
    for (let k = 0; k <= 100; k++) { const o = cameraAt((1 + k / 200) / N, mk()); if (o.pos.y < cloudTopAt(o.lift) && o.pos.y > cloudTopAt(o.lift) - 26) inside = true; }
    expect(inside).toBe(true);
  });
});
describe('anchors are read-only', () => {
  it('frozen at run time; anchorCopy gives a free copy', async () => {
    const { anchorCopy } = await import('../src/climb/path.js');
    expect(() => { STAGE_ANCHORS[2].cam.y = 99; }).toThrow();
    const c = anchorCopy(2); c.cam.y = 99;
    expect(STAGE_ANCHORS[2].cam.y).toBe(1.7);
  });
});
