// AudioManager — MUTED (synth placeholders removed).
// The synthesized wind/swell/crackle/pad layers sounded poor as placeholder audio.
// This component is kept as the mount point and architecture reference; it will be
// re-enabled once real audio assets are sourced.
//
// TO RESTORE:
//   1. Drop a CC0 wind/ambience loop into src/audio/ambience/ and load it here.
//   2. Re-import the layer creators below and restore the useEffect body.
//   3. Restore the audio-toggle button in src/ui/Nav.jsx.
//
// See src/audio/music/README.md and src/audio/effects/README.md for asset notes.
export default function AudioManager() {
  return null;
}
