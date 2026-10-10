// One background worker for the heavy geometry math (see world.worker.js), so page arrival never freezes the frame.
// runInWorker(kind, payload, transfer) resolves with the worker's reply, or null when workers are unavailable or fail,
// and the caller then does the work on the main thread as before.
let worker = null, nextId = 0;
const pending = new Map();

function getWorker() {
  if (worker === null) {
    try {
      worker = new Worker(new URL('./world.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => { const r = pending.get(data.id); pending.delete(data.id); if (r) r(data); };
      worker.onerror = () => { worker = false; for (const r of pending.values()) r(null); pending.clear(); };
    } catch { worker = false; }
  }
  return worker || null;
}

export function runInWorker(kind, payload, transfer = []) {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, kind, ...payload }, transfer);
  });
}
