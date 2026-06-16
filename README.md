# Khaylub Portfolio

**Future source of truth for Khaylub.com.**

This repository is the clean, long-term home for the Khaylub.com portfolio website,
built with plain HTML, CSS, and JavaScript.

## Status

- **This repo is the future source of truth for Khaylub.com.**
- The **current live site** at www.khaylub.com is still served by the separate
  `EyesUncloudedPortfolio` project (Flask on Render). **That deployment is unchanged.**
- The site on the **`local-mvp-import`** branch is **not deployed yet** — it is a staging
  import for review. No `CNAME`, no hosting, and no DNS changes have been made.

## Contents (`local-mvp-import` branch)

- `index.html` — single-page portfolio: grass/wind loading screen, traveler/mountain
  journey hero, plus About, Projects, Learning Journey, and Contact sections.
- `styles.css` — themed, responsive styling (sticky mobile nav, reduced-motion support).
- `script.js` — loading-screen dismissal, mobile navigation, and scroll-spy.

Plain HTML/CSS/JS only — no frameworks, no Three.js, and no Blender assets yet.

## Roadmap

1. Review and refine this MVP import.
2. Choose a static host and migrate the domain from the current deployment
   (keeping the existing site live as a fallback until the new one is verified).
3. Later: progressively enhance with Three.js + Blender assets
   (the Wanderer character, seasonal journey, backpack portal menu).

## Local source

Imported from the local working copy at
`Desktop/Projects/Khaylub.com/website` (originals preserved locally).
