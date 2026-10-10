# Khaylub Thompson-Calvin: the Climb and the Summit

The June 2026 V1 is preserved at tag v1.0.0-3d-experiment and branch legacy/v1-3d-experiment.

This is the site at v1.khaylub.com: two pages on one small three.js engine, built as one static site with plain HTML, CSS and JavaScript and bundled by Vite.

| Address | What |
|---|---|
| `/` | **The Climb**: one long scroll that walks the Wanderer through six scenes, from a desert night under the stars, through a pine forest at blue hour, a misty river at dawn, a rain-swept ridge and a snowfield at dusk, to a golden wheat field at golden hour. |
| `/summit/` | **The Summit**: Home, Films (`/summit/films/`), Questions (`/summit/questions/`) and Builds (`/summit/builds/`), each with its own station on a summit ledge above a sea of clouds. |
| `/404.html` | Any missing address, with a way back to the Climb and to the Summit. |

## Design reasoning
- **Familiar first (Jakob's Law):** one header, one footer and the same plain labels on every page, so nothing has to be learned twice. The Summit's pages match the channel's playlists.
- **Scroll as the story:** the Climb's camera rests on each scene while its caption is on screen and rises over a sea of cloud between scenes, so each change of scene happens out of sight. A rail jumps straight to any scene.
- **Text first:** every page is plain HTML that reads in order with no JavaScript and no WebGL. The 3D is a backdrop that loads after the words, and each Climb scene downloads only when the journey nears it.
- **Accessibility:** a skip link, visible keyboard focus, touch targets of at least 44 px, captions checked for contrast, and `prefers-reduced-motion` honoured. A **Pause motion** button shows each scene as a still picture and is remembered per browser.
- **Real scale:** every model is sized in metres to its real-world size, so the scenes read as places.

## Run, test, build
Node 22 (see `.node-version`).
```
npm ci
npm run dev           # the Summit: http://127.0.0.1:5173
npm run dev:climb     # the Climb:  http://127.0.0.1:5174
npm test              # unit tests (vitest)
npm run build         # the combined site into dist/
```

Browser checks drive Microsoft Edge through Playwright, which is not a project dependency: install it once outside the project and point `NODE_PATH` at that `node_modules`.
```
node scripts/tests/deploy-check.mjs dist 5191                  # the whole built site: Climb, Summit, links, 404, console
node scripts/tests/climb-behaviour.mjs http://127.0.0.1:5174   # the Climb's behaviour, against its dev server
node scripts/tests/climb-scroll.mjs http://127.0.0.1:5174      # whole-journey scroll: no frame over 50 ms
npm run regression                                             # the Summit's behaviour and page-switch checks (dev server on 5173)
node scripts/tests/serve-static.mjs dist 5191                  # serve a build with real 404s, to look around
```

## Where things are
| What | Where |
|---|---|
| Shared engine (render loop, sky, clouds, peaks, phoenix) | `src/engine/` |
| The Summit: pages, scene, stations | `index.html`, `films/`, `questions/`, `builds/`, `src/main.js`, `src/world/` |
| The Climb: page, journey, camera path, the Wanderer, the six scenes | `climb/index.html`, `src/climb/`, `src/climb/stages/` |
| Models, fonts, link previews, thumbnails | `public/` |
| Build settings | `vite.config.js` (the Summit), `vite.climb.config.js` (the Climb), `.env`, `.env.deploy` |

## Deploy (Render, static site)
- **Build command:** `npm run build` (it runs `npm run build:deploy`, then moves `dist-deploy/` to `dist/`).
- **Publish directory:** `dist`.
- **Node:** 22 (from `.node-version`; set `NODE_VERSION=22` if the service pins an older one).
- No rewrite rule that sends every path to `/index.html`: the site has real pages under `/summit/` and its own `/404.html`.
