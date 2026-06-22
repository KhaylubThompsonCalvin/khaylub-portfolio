// Ember crackle (layer 1 / environmental SFX) — sparse short noise grains through a random
// bandpass read as the soft crackle of fire. Synthesized (no sample): a light scheduler spawns
// decaying noise bursts whose density and loudness scale with setLevel(), which AudioManager
// drives from scroll so the crackle only lives in the phoenix fire window. Feeds the master gain.
//
// (Birds and footsteps want real recordings rather than synthesis to avoid sounding fake — they
// slot in here as samples per ../effects/README.md; crackle is the one that synthesizes honestly.)
export function createEmberCrackle(ctx, destination) {
  const out = ctx.createGain();
  out.gain.value = 0.22;
  out.connect(destination);

  let level = 0;
  const timer = setInterval(() => {
    if (level <= 0.01) return;
    if (Math.random() > level * 0.7) return; // denser as the fire grows
    const t = ctx.currentTime;
    const dur = 0.02 + Math.random() * 0.05;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); // a short decaying tick
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800 + Math.random() * 2200;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.value = (0.08 + Math.random() * 0.14) * level;
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + dur);
  }, 90);

  return {
    setLevel(v) {
      level = Math.max(0, Math.min(1, v));
    },
    dispose() {
      clearInterval(timer);
    },
  };
}
