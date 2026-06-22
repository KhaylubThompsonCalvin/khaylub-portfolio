// Story-beat audio (layer 3) — soft atmospheric swells tied to narrative moments (the phoenix
// reveal, the summit), synthesized in Web Audio. Deliberately non-melodic (an airy band-passed
// rise plus a faint high shimmer at the strongest swells), so it reads as story atmosphere rather
// than the opt-in music. AudioManager drives setLevel() from scrollProgress, so each beat rises as
// you reach it and fades naturally between sections. Feeds the master gain, so mute governs it too.
export function createStoryBeats(ctx, destination) {
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(destination);

  // Airy rise — looped noise through a bandpass; the swell is in out.gain.
  const seconds = 3;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const air = ctx.createBiquadFilter();
  air.type = 'bandpass';
  air.frequency.value = 1400;
  air.Q.value = 0.7;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.5;
  noise.connect(air);
  air.connect(airGain);
  airGain.connect(out);
  noise.start();

  // Faint sustained high shimmer (an open fifth) that only joins at the biggest swell — the
  // summit "emotional peak". Held under its own gain so it can be brought in independently.
  const shimmer = ctx.createGain();
  shimmer.gain.value = 0;
  shimmer.connect(out);
  const oscs = [];
  [659.25, 987.77].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.06;
    osc.connect(g);
    g.connect(shimmer);
    osc.start();
    oscs.push(osc);
  });

  return {
    // 0..1 from scroll: out swells with the beat; shimmer only joins past the halfway point.
    setLevel(v) {
      const lvl = Math.max(0, Math.min(1, v));
      out.gain.setTargetAtTime(lvl * 0.45, ctx.currentTime, 0.8);
      shimmer.gain.setTargetAtTime(Math.max(0, (lvl - 0.5) / 0.5) * 0.8, ctx.currentTime, 1.1);
    },
    dispose() {
      try {
        noise.stop();
        oscs.forEach((o) => o.stop());
      } catch {
        /* already stopped */
      }
    },
  };
}
