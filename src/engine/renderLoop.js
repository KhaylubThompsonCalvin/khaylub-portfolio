// The render loop both sites share: the renderer, a pixel budget, adaptive quality, still mode and a ~60 fps cap.
// Measured 2026-10-09: a 240 Hz monitor redrew 4x for no gain; Edge falling back to software drew 1 to 2 fps.
import * as THREE from 'three';

const PIXEL_BUDGET = 5.5e6;
const MIN_GAP = (1000 / 60) * 0.8;

// the adaptive rule, pure so it can be tested: judged once a second on frames actually drawn
export function nextQuality({ fps, scale, lastDrop, now, calmFor }) {
  if (fps < 12 && scale <= 0.35) return { scale, lastDrop, calmFor: 0, still: true };
  if (fps < 40 && scale > 0.35) return { scale: Math.max(0.35, scale * (fps < 20 ? 0.6 : 0.8)), lastDrop: now, calmFor: 0, still: false };
  if (fps > 55 && scale < 1 && now - lastDrop > 8000) {
    const c = calmFor + 1;
    return c >= 3 ? { scale: Math.min(1, scale / 0.85), lastDrop, calmFor: 0, still: false } : { scale, lastDrop, calmFor: c, still: false };
  }
  return { scale, lastDrop, calmFor: 0, still: false };
}

// a draw gap longer than this starts a fresh fps window (idle still-mode draws, a hidden tab), so a gap never reads as
// low fps. It stays above a second so a machine held under 4 fps (frames ~250 to 999 ms apart) is still judged.
export const GAP_RESET = 1000;

// the fps window, pure so it can be tested: tick(now, ready, still) on every draw; returns the fps once a second, else null
export function createFpsMeter() {
  let t0 = null, n0 = 0, n = 0, last = -Infinity;
  return {
    tick(now, ready, still) {
      const gap = now - last; last = now; n++;
      if (!ready || still || gap > GAP_RESET) t0 = null;
      if (!ready) return null;
      if (t0 === null) { t0 = now; n0 = n; return null; }
      if (now - t0 < 1000) return null;
      const fps = (n - n0) * 1000 / (now - t0); t0 = now; n0 = n;
      return fps;
    },
  };
}

export function createRenderLoop({ canvas, small }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|basic render|warp|software/i.test(gpuName);
  const q = { scale: software ? 0.5 : 1, lastDrop: -1e9, calmFor: 0 };
  let still = software, needsDraw = true, lastDraw = -Infinity, draws = 0;
  const meter = createFpsMeter();
  const maxRatio = () => Math.min(window.devicePixelRatio, small ? 1.5 : 1.75, Math.sqrt(PIXEL_BUDGET / Math.max(1, window.innerWidth * window.innerHeight)));
  const resizeHooks = [];
  function resize() {
    renderer.setPixelRatio(Math.max(0.35, maxRatio() * q.scale));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    needsDraw = true;
    for (const h of resizeHooks) h(canvas.clientWidth, canvas.clientHeight);
  }
  window.addEventListener('resize', resize);
  const timer = new THREE.Timer();
  function start(onFrame, isReady) {
    const frame = (now) => {
      requestAnimationFrame(frame);
      if (now - lastDraw < MIN_GAP) return;
      if (still) { if (!needsDraw) return; needsDraw = false; }
      lastDraw = now; draws++;
      const fps = meter.tick(now, isReady(), still);
      if (fps !== null) {
        const r = nextQuality({ fps, ...q, now });
        if (r.still && !still) { still = true; needsDraw = true; }
        if (r.scale !== q.scale) { q.scale = r.scale; resize(); }
        q.lastDrop = r.lastDrop; q.calmFor = r.calmFor;
      }
      timer.update();
      onFrame(Math.min(timer.getDelta(), 0.05), now);
    };
    resize();
    requestAnimationFrame(frame);
  }
  return {
    renderer, gl, gpuName, software, quality: q, resize, start,
    onResize(h) { resizeHooks.push(h); },
    requestDraw() { needsDraw = true; },
    setStill(v) { still = v; needsDraw = true; },
    get still() { return still; },
    get draws() { return draws; },
  };
}
