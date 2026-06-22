# music — optional soundtrack (layer 2)

Opt-in only. The nav sound toggle enables ambience today; when a score asset lands here, the
**music layer becomes a separate explicit opt-in** (never autoplays, no lyrics, no trailer cues —
a slow cinematic ambient score that supports reflection and growth).

Drop the loop here (e.g. `score-ambient.mp3`, seamless, ~60–120 s) and load it in
`components/AudioManager.jsx` as a second gain layer fed off the master, gated by an explicit
"music on" store flag. Candidate source: Higgsfield `generate_audio` (ambient, no vocals) — always
`get_cost` first.
