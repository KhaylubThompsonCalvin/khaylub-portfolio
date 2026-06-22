# effects — environmental + story-beat sounds (layers 1 & 3)

Short samples that ride the scroll, beside the synthesized wind in `../ambience/wind.js`:

- **Environmental:** distant birds, light air movement, footsteps (gated to the Wanderer's
  0→0.66 walk window), phoenix wing flutters, ember crackle (gated to the phoenix window).
- **Story beats:** phoenix-reveal swell, ember-transition rise, summit emotional peak — one-shots
  or slow rises triggered as scrollProgress crosses each beat, fading naturally between sections.

Add each as a small file here, load it once in `components/AudioManager.jsx`, and drive its gain
from scrollProgress (the same `store.subscribe` pattern the wind uses). Keep everything under the
master gain so the nav toggle and mute persistence govern all of it. Generatable via Higgsfield
`generate_audio` — `get_cost` first.
