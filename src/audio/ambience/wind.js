// Wind-through-grass ambience, synthesized with the Web Audio API — no asset to load. Looped
// low-passed noise with a slow LFO "gust" on the filter reads as wind over an open landscape.
// The AudioManager maps scrollProgress to setIntensity() so it breathes louder in the open beats.
// (Layer 1 of the audio system; distant birds / footsteps / ember crackle slot in beside it as
// real samples under src/audio/effects when those assets exist.)
export function createWind(ctx, destination) {
  // ~3 s of brown-ish noise (integrated white) → a soft, wind-like rumble rather than hiss.
  const seconds = 3;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 420; // warmer/softer — less hiss, more low wind

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 360;
  band.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0; // silent until setIntensity ramps it (no pop)

  src.connect(lowpass);
  lowpass.connect(band);
  band.connect(gain);
  gain.connect(destination);
  src.start();

  // Slow gusting: an LFO sweeps the low-pass cutoff so the wind rises and falls.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 130;
  lfo.connect(lfoDepth);
  lfoDepth.connect(lowpass.frequency);
  lfo.start();

  return {
    // 0..1 → eased toward a low ceiling so it's a faint bed, never noise that dominates.
    setIntensity(v) {
      const target = Math.max(0, Math.min(1, v)) * 0.18;
      gain.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
    },
    dispose() {
      try {
        src.stop();
        lfo.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
