import { describe, it, expect, vi } from 'vitest';
import { createStageSet } from '../src/climb/stageSet.js';
const defer = () => { let res, rej; const p = new Promise((r, j) => { res = r; rej = j; }); return { p, res, rej }; };
const flush = () => new Promise((r) => setTimeout(r, 0));
describe('stageSet', () => {
  it('a stale loader never overwrites or leaks a newer build', async () => {
    const ds = [defer(), defer(), defer()]; let n = 0; const disposed = [];
    const loaders = [0, 1, 2, 3, 4, 5, 6].map((j) => () => (j === 0 && n++ < 2 ? ds[n - 1].p : Promise.resolve({ id: j })));
    const set = createStageSet({ count: 7, loaders, build: (m) => ({ id: m.id, dispose() { disposed.push(m.id); } }) });
    set.want(0); set.want(4);      // stage 0 released while loading
    set.want(0);                   // wanted again: second loader in flight
    ds[0].res({ id: 0 }); ds[1].res({ id: 0 }); await flush();
    expect(set.built().filter((m) => m.id === 0).length).toBe(1);
    expect(set.built().every((m) => typeof m.dispose === 'function')).toBe(true);
  });
  it('skips loading tokens on release', () => {
    const set = createStageSet({ count: 7, loaders: Array(7).fill(() => new Promise(() => {})), build: (m) => m });
    set.want(0); expect(() => set.want(5)).not.toThrow();
  });
  it('a jump loads only the wanted stage and its neighbours, the wanted stage first', () => {
    const order = [];
    const loaders = [0, 1, 2, 3, 4, 5].map((j) => () => { order.push(j); return new Promise(() => {}); });
    const set = createStageSet({ count: 6, loaders, build: (m) => m });
    set.want(4);
    expect(order).toEqual([4, 5, 3]);
    expect([...set.live.keys()].sort()).toEqual([3, 4, 5]);
  });
  it('passes the stage index to build and lists built entries by index', async () => {
    const seen = [];
    const set = createStageSet({ count: 3, loaders: [0, 1, 2].map(() => () => Promise.resolve({})), build: (m, j) => { seen.push(j); return { dispose() {} }; } });
    set.want(1); await flush();
    expect(seen.sort()).toEqual([0, 1, 2]);
    expect(set.entries().map(([j]) => j).sort()).toEqual([0, 1, 2]);
  });
  it('a rejected loader frees its slot, warns, and retries on the next want', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let calls = 0;
    const loaders = [() => (calls++ === 0 ? Promise.reject(new Error('404')) : Promise.resolve({ id: 0 }))];
    const set = createStageSet({ count: 1, loaders, build: (m) => ({ id: m.id, dispose() {} }) });
    set.want(0); await flush();
    expect(set.live.has(0)).toBe(false);
    expect(warn).toHaveBeenCalled();
    set.want(0); await flush();
    expect(set.built().map((m) => m.id)).toEqual([0]);
    warn.mockRestore();
  });
  it('a loader that throws synchronously, or a build that throws or rejects, frees its slot', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loaders = [() => { throw new Error('sync'); }, () => Promise.resolve({ bad: 'throw' }), () => Promise.resolve({ bad: 'reject' })];
    const build = (m) => { if (m.bad === 'throw') throw new Error('build'); return Promise.reject(new Error('async build')); };
    const set = createStageSet({ count: 3, loaders, build });
    expect(() => set.want(1)).not.toThrow(); await flush();
    expect(set.live.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
  it('an async build released before it finishes is disposed, not kept', async () => {
    const d = defer(); const disposed = [];
    const set = createStageSet({ count: 6, loaders: Array(6).fill(() => Promise.resolve({})), build: (m, j) => (j === 0 ? d.p : { j, dispose() {} }) });
    set.want(0); await flush();
    set.want(5); await flush();                  // stage 0 released while its build is pending
    d.res({ j: 0, dispose() { disposed.push(0); } }); await flush();
    expect(disposed).toEqual([0]);
    expect(set.live.has(0)).toBe(false);
  });
  it('an onBuilt that throws (a failed warm-up) disposes the stage, frees its slot, and the next want retries', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const disposed = []; let fail = true;
    const set = createStageSet({ count: 1, loaders: [() => Promise.resolve({})], build: () => ({ dispose() { disposed.push(1); } }),
      onBuilt: () => { if (fail) { fail = false; throw new Error('warm'); } } });
    set.want(0); await flush();
    expect(disposed).toEqual([1]); expect(set.live.has(0)).toBe(false); expect(warn).toHaveBeenCalled();
    set.want(0); await flush();
    expect(set.built().length).toBe(1);
    warn.mockRestore();
  });
});
