// Load-ahead / release bookkeeping for stage modules, kept free of WebGL so it can be unit tested.
// A live entry is either a loading token (an object with no build result) or a built module.
// want(i) loads stage i first, then i + 1, then i - 1, and releases anything more than two away. A loader that rejects or
// throws, or a build that throws or rejects, frees its slot and warns, so the next want(i) tries again; the page never stalls.
// build(module, index) may return the stage or a Promise of it; a build that finishes after its slot was released is disposed.
export function createStageSet({ count, loaders, build, onBuilt }) {
  const live = new Map();           // stage index -> token | built module
  const tokens = new Set();
  const stale = Symbol('stale');
  const load = (j) => {
    const tok = {}; tokens.add(tok); live.set(j, tok);
    const mine = () => live.get(j) === tok;
    let started;
    try { started = Promise.resolve(loaders[j]()); } catch (e) { started = Promise.reject(e); }
    started
      .then((m) => (mine() ? build(m, j) : stale))
      .then((b) => {
        tokens.delete(tok);
        if (b === stale) return;
        if (!mine()) { b?.dispose?.(); return; }
        live.set(j, b);
        // a throwing onBuilt (the world's warm-up compiles synchronously) must not leave a half-ready stage behind
        try { onBuilt?.(j, b); } catch (e) {
          if (live.get(j) === b) live.delete(j);
          try { b.dispose?.(); } catch { /* already failing; the warning below covers it */ }
          throw e;
        }
      })
      .catch((e) => {
        tokens.delete(tok);
        if (mine()) live.delete(j);
        console.warn(`Climb: stage ${j + 1} did not load; it will try again`, e);
      });
  };
  const want = (i) => {
    for (const j of [i, i + 1, i - 1]) if (j >= 0 && j < count && !live.has(j)) load(j);
    for (const [j, m] of live) if (Math.abs(j - i) > 2) { live.delete(j); if (!tokens.has(m)) m.dispose(); }
  };
  const entries = () => [...live].filter(([, m]) => !tokens.has(m));
  return { want, live, entries, built: () => entries().map(([, m]) => m) };
}
