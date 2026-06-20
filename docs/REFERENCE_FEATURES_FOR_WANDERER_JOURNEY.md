# Reference Features for Wanderer Journey

> **Goal:** Catalog cinematic storytelling features used on live reference sites that can be adapted for Khaylub.com before the full Blender/Wanderer experience launches. Non-blocking, implementation-optional.

---

## Cinematic Storytelling Features (2026 Web Trends)

### 1. **Scrollytelling (Scroll-Driven Narrative)**
*The core feature: story unfolds as users scroll, animation and content reveal tied to scroll position.*

**How it works:**
- Content unfolds dynamically as users scroll through a page
- Each scroll movement triggers animations, transitions, and media reveals
- Creates a reward-based feedback loop — the user controls the pace

**Tools to implement:**
- **GSAP** (GreenSock Animation Platform) — industry standard for scroll-triggered animations
- **Intersection Observer API** — native browser API for scroll-based triggers
- **Lottie** — for lightweight SVG animations

**Applied to Khaylub.com:**
- Hero section could reveal the Wanderer's silhouette in stages as you scroll
- Projects section reveals cards at staggered intervals
- Journey section (Camp I–Summit Approach) could be a scroll-timeline with animated waypoint reveals

**Reference:** Wamos Air (scrollytelling with user control), Snow Fall (NYT classic), Google Year in Search

---

### 2. **Cinematic Camera / Parallax Depth**
*Multiple layers move at different speeds, creating visual depth and atmosphere.*

**How it works:**
- Background layers move slower than foreground
- Creates sense of movement and 3D depth without WebGL
- Enhances emotional impact of hero/scene transitions

**Applied to Khaylub.com:**
- Hero section: mountains could move on a slower parallax than the traveler path
- As you scroll, background clouds/sky shift at different rates than the path
- Makes the journey feel cinematic without 3D

**Tools:**
- CSS `transform: translateZ()` and `will-change`
- Custom scroll listeners with requestAnimationFrame
- Native `scroll-behavior: smooth`

---

### 3. **Scroll-Pinned Sections (Full-Viewport Reveals)**
*A section "pauses" the scroll and reveals content in stages before releasing to the next section.*

**How it works:**
- User scrolls, section pins to viewport
- Content animates while locked in place
- After animation completes, scroll resumes to next section
- Creates cinematic "chapters"

**Applied to Khaylub.com:**
- Each Camp in the Journey could pin, reveal context, then unlock
- Project cards could pin and reveal details before moving to the next waypoint

**Tools:**
- GSAP ScrollTrigger (built for this exact pattern)
- Custom scroll-position tracking with JavaScript

---

### 4. **Interactive 3D Scene Transitions (WebGL)**
*Light 3D visuals (mountains, landscape) controlled via scroll or click.*

**Important:** This is a future feature, not required now.

**How it works:**
- Three.js or Babylon.js for lightweight 3D
- Camera moves through a 3D scene as you scroll
- Can include basic 3D models (mountains, path)
- Much lighter than full cinematic rendering

**Applied to Khaylub.com (Phase 4):**
- Once Blender assets exist, a spring/summer/fall/winter landscape could be a scrollable 3D environment
- The Wanderer could walk through it as you scroll

**Tools:**
- Three.js (with GLTFLoader for Blender exports)
- Babylon.js (alternative, good for beginners)
- glTF/GLB export from Blender

---

### 5. **Data / Timeline Visualization**
*Sequential data presented as a visual journey (like your "Elevation Gained").*

**How it works:**
- Timeline markers, milestones, or waypoints reveal as you scroll
- Text, images, and icons stagger in
- Creates sense of progression and pacing

**Already on Khaylub.com:** The "Elevation Gained" section is a foundation for this.

**Enhancements:**
- Stagger the Camp cards using GSAP
- Add progress indicators (altitude, distance, time)
- Reveal details about each Camp on hover or scroll

**Tools:**
- GSAP for staggered reveals
- CSS Grid/Flexbox for alignment

---

### 6. **Smooth Typography & Color Transitions**
*Text size, weight, and color change to signal narrative shifts and scale changes.*

**How it works:**
- Font-size animates based on scroll
- Color palette shifts (e.g., dawn → midday → dusk) to match story arc
- Typography itself becomes a storytelling device

**Applied to Khaylub.com:**
- Hero title could subtly grow as scroll begins
- Section titles change color based on "time of day" (spring/summer/fall theme)
- Project cards use different typeface weights to signal importance

**Tools:**
- CSS custom properties (variables) + scroll listeners
- GSAP TextPlugin for dynamic text sizing

---

### 7. **Microinteractions & Hover States**
*Small, delightful interactions that reward attention: button hover effects, card reveals, sound cues.*

**How it works:**
- Hovering a project card reveals hidden details
- Clicking a waypoint expands context
- Small animations on interaction (bounce, fade, scale)

**Already on Khaylub.com:** The project cards are non-interactive; could add:
- Hover to reveal more description
- Click to expand full details (modal or inline)
- Animated underlines on links

**Tools:**
- CSS `:hover` states
- Small GSAP animations on `mouseenter`/`mouseleave`

---

### 8. **Horizontal Scroll Sections (Variety)**
*Break up vertical scrolling with a horizontal scroll segment to avoid monotony.*

**How it works:**
- A section scrolls horizontally while maintaining vertical scroll position
- Creates visual variety and engagement shift
- Used sparingly for maximum impact

**Applied to Khaylub.com (optional):**
- Projects could be a horizontal carousel reveal
- Timeline milestones could scroll sideways
- Must be used carefully — accessibility and mobile UX can suffer

---

### 9. **Ambient Sound Design (Optional, Opt-In)**
*Background music or atmospheric sounds tied to scroll position.*

**How it works:**
- Page starts muted or with soft background track
- Footsteps, wind, or ambient music plays as user engages
- Must respect `prefers-reduced-motion` and have a mute button

**Applied to Khaylub.com (Phase 3+):**
- Soft wind/mountain ambience
- Subtle footstep sounds as traveler "walks" the trail
- Only if it enhances rather than distracts

**Tools:**
- Web Audio API
- Howler.js for library wrapper

---

### 10. **Portal / Backpack Navigation Menu**
*Your unique idea: navigation opens from a character backpack (future Wanderer feature).*

**How it works:**
- A visual "portal" opens at scroll position or on click
- Each menu item links to a different "leg" of the journey
- Creates immersion — navigation *is* part of the journey

**Applied to Khaylub.com (Phase 4, with Blender):**
- Wanderer backpack becomes clickable
- Opens a portal/menu with projects/sections
- Sections are "destinations" the traveler visits

**Tools:**
- Three.js for 3D backpack model
- Custom click handling + modal UI

---

## Feature Priority for Launch Readiness

### **Phase 1 (Static Only — Current)**
- ✅ No changes needed; copy is locked.

### **Phase 2 (Cinematic Foundation — Before Blender)**
*Add these without Blender dependencies:*

1. **Scrollytelling on Journey section** — GSAP ScrollTrigger pinning
   - Each Camp reveals in stages
   - Estimated effort: 3–4 hours
   - Impact: Makes the timeline feel more cinematic

2. **Parallax in hero section** — Background/foreground layers
   - Mountains shift at different speeds
   - Estimated effort: 2–3 hours
   - Impact: Immediate visual upgrade

3. **Staggered project card reveals** — GSAP animation
   - Cards appear on scroll, not all at once
   - Estimated effort: 1–2 hours
   - Impact: Makes projects feel more intentional

4. **Smooth color/typography transitions** — CSS custom props + scroll
   - Text size subtly changes, colors shift
   - Estimated effort: 2–3 hours
   - Impact: Reinforces "journey through seasons" theme

5. **Microinteractions on cards** — Hover states, subtle animations
   - Project cards respond to interaction
   - Estimated effort: 1–2 hours
   - Impact: Site feels more responsive and alive

**Total Phase 2 effort:** ~10–15 hours, spread across 2–3 weeks

### **Phase 3 (Blender + Three.js — When Assets Exist)**
- Light 3D landscape (mountains, path)
- Wanderer character in scene
- Camera scroll through environment

### **Phase 4 (Full Cinematic Vision)**
- Backpack portal menu
- Seasonal environment transitions
- Wanderer walk cycle animation
- Full interactive journey

---

## Libraries & Tools to Familiarize With

| Tool | Purpose | Learning curve | Size |
|------|---------|-----------------|------|
| **GSAP** | Scroll animations, tweens | Easy–Medium | 40 KB |
| **GSAP ScrollTrigger** | Scroll-pinning, timeline | Medium | Extension |
| **Three.js** | Lightweight 3D (Phase 3) | Hard | 500+ KB (min) |
| **Lottie** | SVG animations | Easy | 25 KB |
| **Howler.js** | Audio playback (optional) | Easy | 20 KB |
| **Intersection Observer** | Native scroll trigger | Medium | 0 KB (native API) |

---

## Performance Considerations (Critical)

All of these features must maintain **Core Web Vitals** to avoid SEO damage:
- **LCP (Largest Contentful Paint):** < 2.5s — don't load heavy libraries upfront
- **CLS (Cumulative Layout Shift):** < 0.1 — smooth animations, no janky reveals
- **FID (First Input Delay):** < 100ms — scroll listeners must use `will-change` and `transform` only

**Guidelines:**
- Load GSAP only when needed (lazy load or defer)
- Use `transform` and `opacity` for animations, not `top`/`left`/`width`
- Test on 3G throttle and mobile devices
- Use `prefers-reduced-motion` to disable animations for users who need it

---

## Recommended Reading / Reference Sites

**Live Examples:**
- Wamos Air (scrollytelling with 3D transitions, user-controlled journey)
- Google Year in Search (cinematic data narrative)
- South China Morning Post Ozzy Osbourne tribute (biographical scrollytelling with pacing)
- The Pudding (data visualization + scroll narrative)

**Educational:**
- GSAP docs: gsap.com/docs (scroll trigger patterns)
- MDN Web Audio API (if adding sound)
- Three.js Getting Started (if adding Phase 3 3D)

---

## Next Step

Once you choose features for Phase 2, create a separate **`FEATURE_BUILD_PLAN.md`** with user stories, wireframes, and sprint breakdown. This doc is reference only — pick what resonates, skip what doesn't.

*No action needed yet. This is a resource for planning the cinematic upgrades before Blender launches.*
