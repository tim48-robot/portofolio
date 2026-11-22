# Review prompt for another agent

Copy everything below the line into a new Claude Code session opened in `/home/justin/portofolio`.

---

You are reviewing a personal portfolio prototype for Justin Timothy, an early-career developer. Your job is to **review and recommend, not rewrite**. Find ways to make it lighter (RAM, GPU, download size, CPU per frame) and cleaner (code structure, maintainability), and point out design or UX weaknesses. **The look and feel must stay the same.** Every suggestion has to keep the visual result the same, or tell me clearly when it would change and how much.

## What exists

All work is in `prototype/`. These are plain HTML/CSS/JS files with no build step and no framework. Several pages are published as claude.ai Artifacts, so each `.html` is a page **fragment** (no `<!doctype>`, `<html>`, `<head>` or `<body>`). `tools/build-dist.sh` wraps them into full documents in `prototype/dist/` for local testing.

| File | Lines | What it is |
|---|---|---|
| `hero.html` | ~740 | Main page. Light "paper" look. A screentone (halftone) canvas panel shows the portrait `me-hero.png` over `bg/panel-2.webp`; the cursor lens reveals full colour. Clicking the panel opens a status card in the silver frame `status-frame-silver.png`. Holding the panel draws cracks, then shatters it into 48 shards and navigates to `awaken.html`. Also has Projects (placeholders) and Contact sections. |
| `awaken.html` | ~800 | Second page. Dark purple **WebGL2** aura scene: scene pass, bloom, composite with an "Ink" mode (Sobel, posterize, screentone), depth-map parallax (`bg-b.webp` + `bg-b-depth.png`), portrait `me.png`, and a perspective mask shader (`mask.png`). There is an optional in-browser depth model (Depth Anything V2 via transformers.js), so check whether it can ever load and what it costs. Hold to charge, release to burst. Status sheet uses the violet frame `status-frame.png`. |
| `sfx.js` | ~170 | Shared Web Audio: synthesized sounds plus mp3 playback from `sfx/`, sound toggle stored in localStorage. |
| `mask-lab.html` | ~460 | Exploration page for mask animations. The chosen one is "2+": 84 CSS-3D shards orbit the head and lock under a hair layer. Uses `layer-mask.png` and `layer-hair.png`, which are full-frame 1086×1449 overlays aligned to `me.png`. Includes Three.js r128 from a CDN for another option. |
| `cursor-lab.html` | ~155 | Custom cursor options (dot + lagging ring; SVG cursors). |
| `sound-lab.html` | ~130 | Sound comparison page. |
| `tools/mask-fit.py` | | Builds the mask and hair layers from `me.png` and `mask.png`. |

Asset weights right now: `me.png` 1.1 MB, `me-hero.png` 1.1 MB, `status-frame.png` 1.1 MB, `mask.png` 340 KB, `status-frame-silver.png` 200 KB, `bg/` 2.3 MB (8 panel backgrounds, but only `panel-2.webp` is used by default), `sfx/` 1.2 MB.

Background notes are in `PLAN.md` and `AWAKEN.md`. The reference sites that set the bar are andrewaryo.com, frvky.online, cindyly.design, tomjohn.design, ysuriadesign.com and shubhu.site.

## Hard constraints (do not suggest breaking these)
- Keep the visuals: manhwa visuals with plain copy, about 80% clean and 20% manhwa. Keep the paper/screentone hero, the dark violet Awaken, the ornate status frames, and the Barlow Condensed status typography.
- Do not mention or add GSoC, RUXAILAB, or any work experience section. It is deliberately left out.
- The user has already rejected these, so don't propose them again: Korean SFX text, STR/INT/AGI stats, busy or detailed hero backgrounds, the code-drawn "red halo", the Saira font for status, synthesized replacements for sounds the user picked from files, and cat drawings made in code.
- Sound stays off by default.

## What to review

1. **Memory and GPU**
   - WebGL in `awaken.html`: render-target count and sizes, texture sizes (including the 1200×1400 portrait canvas), mipmaps, bloom resolution, device-pixel-ratio caps, and whether rendering pauses when the tab is hidden or nothing is changing.
   - Leaks: textures, buffers or blob URLs that are never freed; listeners and rAF loops that never stop; shards or DOM nodes that keep piling up.
   - Canvas 2D in `hero.html`: the halftone redraw cost per frame, `getImageData` and `putImageData` use, offscreen canvases, and what happens on resize.
   - Mask "2+": 84 elements each with clip-path and transform, plus a filter on the container. Should it be WebGL or a single canvas instead? Give the expected gain.
   - The 48-shard shatter: blob screenshot, compositing layers, `will-change`.
2. **Download weight and loading**
   - Image formats and sizes. Could the PNGs be WebP/AVIF with alpha, at the right resolution, with `srcset`?
   - What can be lazy-loaded or preloaded only on intent (for example: load Awaken assets when the user starts holding the panel).
   - Fonts (subset, `display=swap`), CDN scripts, and audio formats and preloading.
   - Give a before/after estimate for total bytes on first load of each page.
3. **Code structure**
   - Duplicated logic across pages (sound wiring, frames, status card, easing helpers). What should become a shared module, and what should stay inline because pages must remain standalone Artifacts?
   - Naming, magic numbers that must stay in sync (`FACE` in `awaken.html`, `placeMe` in `hero.html`, `F` in `mask-lab.html` all depend on `me.png`), and dead CSS/JS.
   - A sensible structure for turning this into a real deployable site later. Static is fine; a framework is only worth it if it really helps.
4. **Design and UX** (within the constraints above)
   - Hierarchy, spacing, typography, and responsiveness at phone, tablet and 1920+ widths.
   - First-time discoverability of "click", "hold to shatter" and "hold to charge".
   - Placeholder content, and anything that feels unpolished next to the reference sites.
5. **Accessibility and robustness**
   - Keyboard paths for hold interactions, focus management in the status dialog, `prefers-reduced-motion`, contrast, and alt text.
   - What happens with WebGL2 unavailable, audio blocked, or slow networks.

## How to work
- Start a local server with `bash prototype/tools/build-dist.sh`, then `cd prototype/dist && python3 -m http.server 8772`.
- Measure; don't guess. Use Playwright (or Chrome DevTools) to record JS heap, GPU memory if available, frame time, long tasks, and network bytes for `index.html` and `awaken.html`. The setup that worked here was headless Chromium with `--use-angle=swiftshader`. Note that swiftshader is much slower than a real GPU, so use relative numbers.
- **Do not edit the original files and do not publish artifacts.** If you want to prove a change, make a copy (for example `prototype/review/`) and measure that copy against the original.

## Deliverable
Write `REVIEW.md` in the repo root with:
1. A short summary of the 5 changes with the biggest impact.
2. A findings table: area, file:line, problem, suggested fix, expected gain (MB / ms / %), visual risk (none / slight / noticeable), effort (S/M/L).
3. Measurements from before and after any proofs you made.
4. A proposed folder structure for the real site.
5. Design and UX notes, kept separate from the performance notes.

Order everything by impact relative to effort. Be concrete: name the file, the line, and the exact change.
