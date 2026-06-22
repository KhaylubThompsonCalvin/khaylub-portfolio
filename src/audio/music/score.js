// Optional cinematic ambient score — layer 2. Synthesized in Web Audio (no asset, no dependency),
// because Higgsfield's audio is text-to-speech only and its music model is off-limits (game
// pipeline). A slow, warm, consonant pad: an open A-minor voicing in lightly detuned pairs through
// a soft low-pass, breathing on a slow LFO. No rhythm, no lyrics, no trailer swell — meant to
// support reflection, not push. Opt-in only (the nav cycles Ambient → +Music → Off). A licensed
// track can replace this later by loading a file here instead (see ./README.md).
export function createScore(ctx, destination) {
  const enable = ctx.createGain(); // clean on/off, no LFO leak when disabled
  enable.gain.value = 0;
  const pad = ctx.createGain(); // base level the breathing LFO rides on
  pad.gain.value = 0.5;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1100;
  lowpass.Q.value = 0.4;

  lowpass.connect(pad);
  pad.connect(enable);
  enable.connect(destination);

  // Open, contemplative Am voicing (root → fifth → octave → minor-third-up → fifth-up).
  const notes = [110.0, 164.81, 220.0, 261.63, 329.63];
  const oscs = [];
  notes.forEach((freq, i) => {
    [-3, 3].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents; // a detuned pair per note → warmth/movement
      const voice = ctx.createGain();
      voice.gain.value = (i < 2 ? 0.16 : 0.09) / 2;
      osc.connect(voice);
      voice.connect(lowpass);
      osc.start();
      oscs.push(osc);
    });
  });

  // Slow breathing swell and a slower filter drift, so the pad evolves rather than sits.
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.06;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.18;
  swell.connect(swellDepth);
  swellDepth.connect(pad.gain);
  swell.start();

  const drift = ctx.createOscillator();
  drift.frequency.value = 0.025;
  const driftDepth = ctx.createGain();
  driftDepth.gain.value = 380;
  drift.connect(driftDepth);
  driftDepth.connect(lowpass.frequency);
  drift.start();

  return {
    setEnabled(on) {
      enable.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 1.2); // slow, unhurried fade
    },
    dispose() {
      try {
        oscs.forEach((o) => o.stop());
        swell.stop();
        drift.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
