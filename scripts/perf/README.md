# Speed tests (Edge, through Playwright)

Run from the project folder with the dev server up (`npx vite --port 5173 --host 127.0.0.1`). Playwright is not a project
dependency; install it once outside the project and point NODE_PATH at that `node_modules` (version 1.61.1 is known to work).
Each test opens a visible Edge window. Close heavy graphics programs first: they share the card and skew the numbers.

| Script | What it answers | Run |
|---|---|---|
| `switch-test.mjs` | Do page switches glide without freezes? One row per switch: frames, worst frame, freezes over 50 ms. `--slow` adds a 4x CPU slowdown (a cheaper laptop). | `node scripts/perf/switch-test.mjs http://127.0.0.1:5173 [--slow]` |
| `fps-readout.mjs` | Frames actually drawn, canvas size and quality at a given window size (default 5120 x 1300, a very wide screen). `SW=1` forces software drawing. | `node scripts/perf/fps-readout.mjs "/?fps&pcam&pd=16" "/?fps"` |
| `software-test.mjs` | In a software-drawing browser, does still mode keep the page responsive and do page switches land? | `node scripts/perf/software-test.mjs` |

Healthy on a desktop graphics card (2026-10-09): 60 fps drawn, worst frame about 5 ms, 0 freezes per switch.
