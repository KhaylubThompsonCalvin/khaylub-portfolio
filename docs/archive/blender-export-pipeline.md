# Blender Export Pipeline

> Workflow for preparing 3D assets in Blender and delivering them to the Khaylub.com website as web-ready GLB files.

## Pipeline Overview

```
Blender (.blend)  →  Export (glTF Binary)  →  Validate  →  Compress (Draco)  →  Deploy
     │                      │                    │              │                  │
assets/blender/      assets/models/         glTF Viewer    optional step    website/public/models/
```

## Folder Conventions

| Location                        | Contents                                      | Deployed?                          |
| ------------------------------- | --------------------------------------------- | ---------------------------------- |
| `assets/blender/{name}/`        | Source `.blend` files + backup versions       | No                                 |
| `assets/models/{name}/`         | Exported `.glb` files (uncompressed or Draco) | Copied to `website/public/models/` |
| `assets/textures/{name}/`       | Standalone texture maps (if not embedded)     | Only if referenced externally      |
| `website/public/models/{name}/` | Production GLBs served by Next.js             | Yes                                |

### Naming rules

- Use **kebab-case**: `hero-scene.glb`, `project-alpha.glb`
- Match the Blender file name: `hero-scene.blend` → `hero-scene.glb`
- Version iterations in Blender only: `hero-scene-v02.blend` — export always overwrites the canonical GLB name
- No spaces, no uppercase in exported file names

## Blender Scene Setup

Follow these conventions **before** modeling to avoid export surprises.

### Scale & units

- Scene unit scale: **1.0** (1 Blender unit = 1 meter)
- Apply all transforms (Ctrl+A → All Transforms) on every mesh before export
- Keep hero scene bounding box roughly within a **4 × 4 × 4 meter** cube for predictable camera framing

### Materials

- Use **Principled BSDF** only — it maps cleanly to glTF PBR
- Avoid unsupported nodes: Glass BSDF, Toon, custom OSL, most procedural textures
- **Bake** procedural or complex materials to PNG/JPEG texture maps before export:
  - Base Color → 1024×1024 or 2048×2048
  - Roughness, Metallic, Normal as needed
- Keep material count low (≤ 10 per scene for hero)

### Geometry

| Asset type         | Poly budget (triangles) |
| ------------------ | ----------------------- |
| Hero scene         | ≤ 100,000               |
| Per-project viewer | ≤ 50,000                |
| Background prop    | ≤ 10,000                |

- Triangulate only if needed (glTF exporter handles quads)
- Remove hidden geometry, duplicate vertices, and unused objects before export
- Delete custom normals only if shading artifacts appear post-export

### Lighting (hero scene)

The web scene will use its own lighting rig in React Three Fiber. Two approaches:

1. **Recommended for Phase 1:** Export geometry only; light in code with `<Environment>` and directional lights.
2. **Alternative:** Bake lighting to vertex colors or a lightmap texture (advanced, Phase 4).

Do not rely on Blender lights exporting correctly — glTF light support is limited in browsers.

### Animation (Phase 4+)

- Bake armature animations to glTF animation clips
- Name actions clearly: `camera-scroll`, `idle-rotate`
- Keep clip count ≤ 5 per file

## Export Settings (glTF Binary .glb)

Use Blender's built-in exporter: **File → Export → glTF 2.0 (.glb/.gltf)**

### Recommended settings

| Setting     | Value                                      | Notes                                   |
| ----------- | ------------------------------------------ | --------------------------------------- |
| Format      | **glTF Binary (.glb)**                     | Single file, easiest to serve           |
| Include     | Selected Objects (or Visible Objects)      | Export only what the scene needs        |
| Transform   | +Y Up                                      | Matches glTF/Three.js convention        |
| Geometry    | Apply Modifiers: **ON**                    | Ensures mirror/array/etc. are baked     |
| Geometry    | UVs: **ON**                                | Required for textures                   |
| Geometry    | Normals: **ON**                            |                                         |
| Geometry    | Tangents: **ON** if using normal maps      |                                         |
| Materials   | Export: **ON**                             |                                         |
| Materials   | Images: **Automatic**                      | Embeds textures in GLB                  |
| Compression | Draco mesh compression: **OFF** in Blender | Compress in a separate step (see below) |
| Animation   | **OFF** for Phase 1 hero                   | Enable in Phase 4 when needed           |

### Export checklist

Before clicking Export:

- [ ] All transforms applied
- [ ] No hidden / unused objects in scene
- [ ] Materials use Principled BSDF with baked textures
- [ ] File named correctly (kebab-case `.glb`)
- [ ] Saved to `assets/models/{name}/`

## Post-Export Validation

1. **File size check** — hero GLB must be ≤ 5 MB uncompressed; if over, reduce textures or polycount and re-export.
2. **Visual check** — open the GLB in one of:
   - [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/)
   - Blender re-import (File → Import → glTF 2.0)
   - Three.js editor
3. **Console check** — glTF viewer should report zero errors; warnings about unsupported extensions are acceptable if visuals are correct.

Record results in a brief note at the bottom of this file or in a per-asset log in `assets/models/{name}/export-log.md`.

## Draco Compression (Phase 3+)

Apply Draco compression before production deploy to reduce transfer size by 60–90%.

### Option A — gltf-pipeline (CLI)

```bash
npx gltf-pipeline -i assets/models/hero/hero-scene.glb \
  -o assets/models/hero/hero-scene.draco.glb \
  -d
```

### Option B — Blender glTF Draco exporter plugin

Enable Draco in the export dialog only after verifying the uncompressed GLB looks correct. Draco can occasionally affect morph targets or edge cases.

### After compression

- Verify file size meets budget
- Re-validate in glTF viewer
- Copy final GLB to `website/public/models/`

## Copying Assets to the Website

For Phase 1, a manual copy is fine:

```
assets/models/hero/hero-scene.glb
    → website/public/models/hero/hero-scene.glb
```

A build script (`website/scripts/copy-models.mjs`) can automate this in Phase 2+.

## Troubleshooting

| Problem                          | Likely cause                             | Fix                                                 |
| -------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| Model is pink/magenta in browser | Missing textures or unsupported material | Bake textures; use Principled BSDF                  |
| Model is enormous or tiny        | Unapplied scale                          | Apply transforms; check unit scale                  |
| Model is rotated wrong           | Axis mismatch                            | Re-export with +Y Up; adjust in R3F if needed       |
| File size too large              | High-poly mesh or 4K textures            | Decimate mesh; resize textures to 1024 or 2048      |
| Normals look faceted             | Shade Smooth not applied                 | Select mesh → Right-click → Shade Smooth            |
| Transparency looks wrong         | Blend mode issue                         | Use Alpha Clip in Principled BSDF; avoid true glass |
| Missing objects in export        | Objects not visible/selected             | Check export scope (Visible vs Selected)            |

## Phase 1 Minimum Asset

For the first shippable page, only one asset is required:

| Asset      | Blender path                           | Export path                         | Notes                                      |
| ---------- | -------------------------------------- | ----------------------------------- | ------------------------------------------ |
| Hero scene | `assets/blender/hero/hero-scene.blend` | `assets/models/hero/hero-scene.glb` | Single object or small group; no animation |

The hero does not need to be final portfolio work — it can be a placeholder sculpt or logo object. The goal is to validate the pipeline, not to ship final art.

## Export Log Template

Create `assets/models/{name}/export-log.md` per asset:

```markdown
# Export Log — hero-scene

| Field                    | Value                                |
| ------------------------ | ------------------------------------ |
| Date                     | YYYY-MM-DD                           |
| Blender version          | 4.x                                  |
| Source file              | assets/blender/hero/hero-scene.blend |
| Output file              | assets/models/hero/hero-scene.glb    |
| File size                | X.X MB                               |
| Triangle count           | XX,XXX                               |
| Draco compressed         | No / Yes                             |
| Validated in glTF viewer | Yes / No                             |
| Notes                    | ...                                  |
```

## Related Documents

- [architecture.md](architecture.md) — performance budgets and data flow
- [phase-1-requirements.md](phase-1-requirements.md) — what the hero asset must achieve
- [build-plan.md](build-plan.md) — when compression and additional assets are needed
