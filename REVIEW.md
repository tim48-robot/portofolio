# Portfolio prototype review

Reviewed 2026-11-17. Nothing in `prototype/*.html`, `sfx.js` or `tools/` was edited and no artifact was published.
Proof copies live in `prototype/review/` (built from the originals by `review/make.py`); measurement scripts and screenshots are in `prototype/review/measure/`.

**How the numbers were taken.** Headless Chromium (Playwright 1.64, `--use-angle=swiftshader`), 1440×900, DPR 1 unless stated, pages served from `prototype/dist` (original) and `prototype/review` (patched) by `python3 -m http.server`. SwiftShader renders on the CPU, so every millisecond figure is **relative**: compare before with after, do not read them as real-device timings. Network bytes are uncompressed transfer sizes from `http.server` (a real host will gzip the HTML/JS to about a third).

---

## 1. The five changes with the biggest impact

| # | Change | Measured result | Visual risk | Effort |
|---|---|---|---|---|
| 1 | **Ship the five PNGs as WebP** (`me.png`, `me-hero.png`, `status-frame.png`, `status-frame-silver.png`, `mask.png`) and the depth map as a grey WebP | First load: hero **1696 → 518 KB**, Awaken **2816 → 503 KB** | none (41–49 dB PSNR, see §3.1) | S |
| 2 | **Hero: build the screentone once, on the CPU, and stop rebuilding on every resize event** | Main-thread blocking at load **≈6.0 s → 0.35 s**; a window resize **7.8 s → 0.04 s** of script | none in the final image; removes a placeholder flash | S |
| 3 | **Do not ship mask "2+" as 84 DOM layers with a filter on the container** | It adds **+260 to +310 MB** of GPU-process memory while the pieces fly. Interim fix −35 %; proper fix is drawing the pieces in Awaken's existing WebGL pass | none (interim) / slight (WebGL port) | S / L |
| 4 | **Awaken: fix the resolution policy** (cap the render scale, repair the adaptive scaler, delete the 4K button) | GPU frame cost is proportional to pixels and 70 % of it is the scene shader. Render targets alone go from **≈126 MB at scale 2 to ≈79 MB at 1.5 and ≈45 MB at 1.0** (1920×1080 viewport) | slight on hi-DPI screens only | S |
| 5 | **Fix the five robustness/accessibility holes that are real bugs today** (no keyboard path to Awaken, status dialog loses focus, reduced-motion kills the hover reveal, no-WebGL2 hides the status sheet, impact flash displaces the shards when the page is scrolled) | All five reproduced, see §3.6 | none | S each |

Two things I expected to matter and measured as **not worth doing**: sizing the hero's 48 shatter shards to their bounding boxes (no memory difference), and caching the per-frame layout reads in Awaken (≈0.15 ms/frame). Details in §3.

One correction to the brief: **there is no in-browser depth model.** No file references transformers.js, ONNX or Depth Anything; `bg-b-depth.png` is a pre-baked image loaded like any other texture (`awaken.html:166`, `:591`). It can never load a model and costs nothing beyond its 73 KB (5 KB as WebP).

---

## 2. Findings

Ordered by impact relative to effort. "Visual risk" is against the current look. Line numbers refer to the untouched originals in `prototype/`.

### 2.1 Performance and weight

| # | Area | File:line | Problem | Suggested fix | Expected gain | Visual risk | Effort |
|---|---|---|---|---|---|---|---|
| P1 | Download | `hero.html:103, 528, 529` · `awaken.html:62, 164, 166, 539, 633` | Five PNGs carry 3.7 MB of the 4.5 MB the two pages download | Encode as WebP q90 with `alpha_quality=100` (Pillow `method=6`). Depth map: convert to greyscale, WebP q85 | Hero −1.18 MB, Awaken −2.27 MB (measured). AVIF q75 saves a further ≈60 KB (hero) / ≈100 KB (Awaken) but needs a WebP fallback | none | S |
| P2 | Hero CPU | `hero.html:486–496, 527, 528, 534` | `build()` runs three times during load (ResizeObserver, portrait loaded, background loaded) and once per resize event with no debounce. Each run allocates 4 full-size canvases and does a GPU read-back | Return early until both `ME.img` and `ME.bg` exist; return early when W×H is unchanged; debounce the ResizeObserver by ~120 ms | Load long tasks ≈6.0 s → 0.35 s together with P3; 12-step resize 7.8 s → 0.04 s of script, 10 long tasks → 0 | none (old bitmap is CSS-stretched for 120 ms while dragging a resize) | S |
| P3 | Hero CPU | `hero.html:448`, read at `:464` | `getImageData` on a GPU-backed canvas forces a synchronous GPU read-back: 1.6–2.0 s per call under SwiftShader, 3 calls at load | Create the read canvas with `fig.getContext('2d', { willReadFrequently: true })` | `getImageData` 4969 ms / 3 calls → 80 ms / 1 call. On its own (without P2) it only fixes one of the three calls | none | S |
| P4 | Mask 2+ GPU | `mask-lab.html:30–31, 250–274, 309–310` | 84 `will-change` elements, each the size of the whole 1086×1449 portrait, clipped to one small triangle, under a `drop-shadow + brightness` filter on the container | Interim: size each piece to its triangle's bounding box (position, `background-size`, `background-position`, `transform-origin` recomputed; patch in `review/measure/maskv.mjs`). For the real page: draw the 84 triangles in Awaken's scene pass (one draw call, the mask texture cropped to its 314×355 box) so they also receive bloom and ink | Original +258 to +309 MB GPU RSS while charging; bounding boxes +182 to +199 MB (−35 %); without the filter +139 MB. WebGL port: no extra layers, < 2 MB | none (interim) / slight (port: glow and timing are re-implemented) | S / L |
| P5 | Awaken GPU | `awaken.html:715, 762–767` | Scale starts at `min(dpr, 1.5)` and may climb to `min(dpr, 2)`. The portrait texture is 1400 px tall for a stage of at most 1100 CSS px, so anything above ≈1.3× cannot sharpen the photo; it only costs fill rate | Cap `maxS` at 1.5 and add a pixel budget (for example 3.7 MP) | Scene + back buffer + bloom: 126 MB → 79 MB on a DPR-2 1080p-class viewport; frame cost −44 % at the same time | slight: procedural effects and ink dots a little softer on DPR 2 screens | S |
| P6 | Awaken logic | `awaken.html:742, 761–767` | Adaptive scaler has three defects: (a) `dt` is clamped to 50 ms before averaging, so a 1 fps frame counts as 20 fps and the HUD prints "20 fps" at 1.2 fps; (b) the upscale test `avg < 14.5 ms` can never pass on a 60 Hz display, so one slow window lowers quality for good; (c) the first 40-frame window includes shader compile and texture upload | Average the unclamped delta; skip the first second; upscale when `avg < 1.2 ×` the fastest window seen; keep hysteresis | Stops permanent quality loss after one hiccup on 60 Hz screens; stops needless render-target reallocation | none | S |
| P7 | Fonts | `hero.html:4` · `awaken.html:3` | Hero: the stylesheet is 55 KB because Dela Gothic One, Gaegu and Black Han Sans are CJK fonts sliced into ~120 `unicode-range` blocks each, used for 8 and 15 Latin glyphs. Barlow Condensed 500 and Black Han Sans are requested and never used. Awaken requests Saira Semi Condensed (rejected font, never used) and two 12 KB Korean slices for three glyphs | Separate `<link>`s with `&text=` for the display fonts (`text=hit.built`, `text=hey, I'm Justin :)`, `text=개발자`); drop unused families and weights. Better: self-host subset WOFF2 | Hero fonts + CSS 137 → 59 KB; Awaken 173 → 132 KB (measured) | none | S |
| P8 | Loading | `hero.html:640–648` | Awaken's 310 KB of images start loading only after the 1.15 s shatter and the navigation | On `pointerdown` on the panel add `<link rel="prefetch">` for `awaken.html`, `me.webp`, `bg-b.webp`, `mask.webp`, `status-frame.webp` | ≈2.4 s head start (1.3 s hold + 1.15 s shatter); Awaken paints complete on arrival | none | S |
| P9 | Awaken startup | `awaken.html:554–565, 576` | A 1200×1400 placeholder silhouette (with glowing eyes) is drawn, uploaded and mip-mapped, then replaced when `me.png` arrives. On a slow network it is visible | Delete line 576; the texture stays 1×1 transparent and the flames, which grow from its alpha, stay off until the photo is there | −6.7 MB transient canvas, one fewer 1200×1400 upload + mip chain; no stand-in figure | none once loaded; first paint shows background only | S |
| P10 | Awaken shader | `awaken.html:312–328, 358–359` | Smoke (3 `fbm`, 15 noise taps) and body veins (1 `fbm`) are computed for every pixel, including where their result is provably zero | Guard the smoke with `if (kS*.97 > th - .045)` and the veins with `if (a > 0. && uvp.y < .6)` (patch in `review/make.py`) | Scene pass 482 → 447 ms idle, 530 → 465 ms awake (−7 to −12 %, noise ±10 %). SwiftShader gains little from branches; real GPUs usually gain more | none: pixel diff with time frozen is 0 px at idle, ≤ 18 of 1 296 000 px off by 1/255 awake | S |
| P11 | Build | `tools/build-dist.sh:14–16` | Copies all 8 panel backgrounds (2.3 MB, one used) and all 35 sound files (1.2 MB, three used = 60 KB) into the deployable folder | Copy only `bg/panel-2.webp`, `shatter-yours.mp3`, `card-whoosh-b.mp3`, `explosion-yours.mp3` | Deploy folder 7.6 MB → ≈0.8 MB after P1 | none | S |
| P12 | Leaks | `hero.html:572, 661` · `awaken.html:593–594` | Blob URLs are never revoked. `shotUrl` is also never refreshed: after "try your own art", or on a second hold, the shards show the first screenshot | `URL.revokeObjectURL` in each `onload`; in `cancelHold()` revoke and clear `shotUrl` | Frees one decoded image per upload; fixes the stale shatter image | none | S |
| P13 | Awaken textures | `awaken.html:545, 591` | Depth map is uploaded as RGBA with a full mip chain but only its red channel is read, at LOD 1 | Ship it at 512×286 and upload as `R8` | 3.1 MB → 0.2 MB GPU | none | S |
| P14 | Awaken robustness | `awaken.html:178–179` | No `webglcontextlost` / `webglcontextrestored` handlers: after a context loss (common on mobile after backgrounding) the canvas stays black | Listen for both, `preventDefault()` on loss, rebuild programs, targets and textures on restore | Recovers instead of going black | none | M |
| P15 | Sound | `sfx.js:60–63, 83` · `hero.html:725` | The once-only `pointerdown` preload runs before the user has enabled sound, so it does nothing; the first whoosh is fetched and decoded when the card opens. A failed `fetch` is cached forever | Preload the page's files inside `setEnabled(true)`; delete the cache entry on rejection | First whoosh plays on time on slow connections | none | S |
| P16 | Awaken idle | `awaken.html:741–793` | Renders at full rate when nothing is happening (power resting at 0.07). `requestAnimationFrame` already stops in hidden tabs, so that part is fine | Render every second frame while `power < .1` and no burst, shock or charge is active | ≈ −50 % GPU while idle | slight: idle embers and smoke at 30 fps | S |
| P17 | Mask lab | `mask-lab.html:160, 411–420` | Three.js r128 (603 KB) loads for an option that was not chosen; the loop rewrites 84 transforms and 84 opacities every frame even at rest (2.7 ms/frame of main thread, measured) | Lab page only: leave it, but do not carry either into the real site. Skip `render()` when `p`, `out` and `mode` are unchanged | −603 KB; idle main thread ≈ 0 | none | S |
| — | Tested, **no gain** | `hero.html:684–701` | 48 full-panel shards with `will-change` | Bounding-box shards (in `review/index.html`) | GPU RSS during shatter: +6/+12 MB original vs +18/+14 MB patched. Within noise. Leave as is | — | — |
| — | Tested, **negligible** | `awaken.html:724–727, 757–758` | Two `getBoundingClientRect()` and two `:root` custom-property writes per frame | Cache the rect; write only on change | 0.46 → 0.31 ms/frame awake, nothing while charging. Not worth the code unless it is free | — | — |
| — | Checked, **fine** | `hero.html:500–526` | Lens redraw: three full-canvas blits per frame, forever while the panel is on screen | — | 0.3 ms of script per frame, 60 fps held; `IntersectionObserver` already stops it off-screen | — | — |

### 2.2 Code structure

| # | Area | File:line | Problem | Suggested fix | Gain | Visual risk | Effort |
|---|---|---|---|---|---|---|---|
| C1 | Dead code | `awaken.html:28–41, 48–51, 86–88, 597–598, 626–666, 673, 702–712, 798` | Old `.status` window CSS; the Korean SFX CSS, word list and `spawnSfx()` (rejected, unreachable); `toast()` never called; a full inline synth that line 798 overwrites by reassigning function declarations | Delete all of it and call `SFX.*` directly at the call sites | ≈110 lines, one source of truth for sound | none | S |
| C2 | Dead code | `hero.html:355–438, 536–547, 549` | 85 lines of placeholder skyline and stick figure that only run before the images load (P2 removes that path); `haloBg()` is the rejected red halo, still exposed as `window.__haloBg` | Delete; keep a plain paper fill as the pre-load state | ≈100 lines | none | S |
| C3 | Magic numbers | `awaken.html:531–532, 537, 570–571` · `hero.html:347` · `mask-lab.html:29, 34–36, 47, 247` · `tools/mask-fit.py:9` | Five places encode where the face is in `me.png`. They agree today only by hand: `FACE` is the eye centre (551, 254) pushed through `photoToCanvas`, i.e. `x' = (1200 − 1086·s)/2 + 551·s`, `y' = 330 − 1449·0.069·s + 254·s`, `s = 1020/1449·1.55`, then `FACE.x = x'/1200·6/7 = 0.435`, `FACE.y = 1 − y'/1400 = 0.644` (the code says 0.434 / 0.6466) | One `portrait.json` (`size`, `eye`, `chin`, `faceWidth`, `maskBox`) read by `mask-fit.py` and imported by the pages; derive `FACE`, `F`, the eye-glow percentages and `perspective-origin` from it | Re-cutting the portrait becomes a one-file change | none | M |
| C4 | Duplicate assets | `me.png`, `me-hero.png` | Same 1086×1449 frame, 4.8 % of pixels differ. Two 1 MB files that must be re-cut together, plus `layer-mask.png` / `layer-hair.png` derived from one of them | Record in `portrait.json` which is the source and generate the other in `mask-fit.py` (or use one file if the difference is not intentional) | One source image | none if the difference is kept | S |
| C5 | Duplication | `hero.html:674–683` · `mask-lab.html:216–223, 252–261` | The jittered-grid triangulation exists three times | `shards.js`: `triangulate(cols, rows, jitter, rand)` returning triangles with centroid and bbox | One implementation | none | S |
| C6 | Duplication | `hero.html:326–333, 720–726` · `awaken.html:597–598, 799–801` | Toast and sound-toggle wiring written twice with different labels ("Sound off" vs "Sound: Off") | Move `bindSoundToggle(button, files)` into `sfx.js`; pick one label | Consistent copy | none | S |
| C7 | Stale tooling | `tools/mask-fit.py:4, 47` · `tools/build-dist.sh:9` | Absolute `/home/justin/...` paths; the last line writes a preview into another session's temp folder that no longer exists, so the script ends in an error after writing the layers. The build script does not build `mask-lab` or `cursor-lab`, yet stale copies sit in `dist/` | Paths relative to the script; write the preview next to the layers; build every page or none of the labs | Reproducible builds | none | S |
| C8 | Stale files | `prototype/` | Not referenced by any shipping page: `bg-a.webp`, `me-v1.png`, `me-v2.png`, `status-frame.webp` (an older opaque 1200×751 frame whose name collides with P1's output), `cur-*.png`, `mask-fit-preview.png`, `dist2/` | Move to `prototype/_archive/` before P1 so the WebP name is free | −3.6 MB of confusion | none | S |
| C9 | Comments | `sfx.js:1–5` | Header says "no audio files"; three of the sounds in use are files. `SFX.v1`, `ding`, `cardFlip`, `shatter`, `chargeStart`, `release` are only used by `sound-lab.html` | Fix the header; split lab-only sounds into `sfx-lab.js` | 12 KB → ≈6 KB on the real pages | none | S |
| C10 | Dev controls | `awaken.html:85, 139, 142–154, 668, 802` | HUD, theme chips, Quality/4K, Photo and BG uploads, `window.__aura` ship in the page | Keep behind `?dev` | Cleaner page, no 4K foot-gun | none for visitors | S |

**What should be shared and what should stay inline.** Shared modules: `sfx.js` (already), `portrait.json`, `shards.js`, a 20-line `util.js` (`$`, `clamp`, `smooth`, `easeOut`, `loadImage`, `reduceMotion`), and the status card's type scale as CSS custom properties. Stay inline in each page: the shaders, the render loops and the page-specific interaction code. For the Artifact versions, extend the build script to inline the shared modules into each fragment, the same way it already wraps them into full documents.

---

## 3. Measurements

### 3.1 Image conversion

| File | Size | PNG | WebP q90 | PSNR | AVIF q75 | PSNR |
|---|---|---|---|---|---|---|
| `me-hero.png` | 1086×1449 | 1033 KB | 91 KB | 46.1 dB | 47 KB | 45.1 dB |
| `me.png` | 1086×1449 | 1037 KB | 92 KB | 46.2 dB | 48 KB | 45.1 dB |
| `status-frame.png` | 1135×742 | 1057 KB | 91 KB | 41.3 dB | 55 KB | 40.3 dB |
| `status-frame-silver.png` | 1154×813 | 198 KB | 38 KB | 49.0 dB | 23 KB | 50.3 dB |
| `mask.png` | 598×900 | 340 KB | 47 KB | 47.1 dB | 22 KB | 46.0 dB |
| `bg-b-depth.png` | 1024×572 | 73 KB | 4.5 KB (grey) | — | — | — |

PSNR is computed on premultiplied colour plus alpha. Lossless WebP only reaches 109–726 KB, so lossy is the right call. `bg/panel-2.webp` can be re-encoded 271 → 198 KB (41 dB) but that is lossy-on-lossy; re-export from the source instead. Resolutions are already right: the panel is at most 420 CSS px wide (840 px at DPR 2) and the portrait is drawn 1326 px tall from a 1449 px source, so `srcset` would save little.

### 3.2 First-load bytes

| | Document + JS | Font CSS | Fonts | Images | **Total** |
|---|---|---|---|---|---|
| Hero, original | 57 KB | 55 KB | 82 KB | 1502 KB | **1696 KB** |
| Hero, review copy | 58 KB | 2 KB | 57 KB | 328 KB | **445 KB** |
| Hero, review copy with `panel-2.webp` left untouched | 58 KB | 2 KB | 57 KB | 401 KB | **518 KB** |
| Awaken, original | 61 KB | 14 KB | 159 KB | 2583 KB | **2816 KB** |
| Awaken, review copy | 61 KB | 2 KB | 130 KB | 311 KB | **503 KB** |

Further, not built: AVIF with fallback (hero ≈ −60 KB, Awaken ≈ −100 KB); using Geist and Geist Mono on Awaken instead of Inter and JetBrains Mono (−68 KB for anyone arriving from the hero, visual risk slight); loading `status-frame-silver` on first hover of the panel instead of at start (−38 KB from the critical path).

### 3.3 Hero CPU

| | Original | Review copy |
|---|---|---|
| Long-task time during load (3 runs) | 6116 / 6204 / 5815 ms | 353 / 339 / 376 ms |
| `getImageData` | 4969 ms in 3 calls | 80 ms in 1 call |
| Canvases created during load | 12 | 6 |
| 12-step window resize: script time | 7801 ms, 10 long tasks | 43 ms, 0 long tasks |
| Idle frame rate, lens drifting | 60.6 fps | 60.7 fps |
| Idle GPU-process CPU per frame | 159 ms | 164 ms (same within noise) |
| JS heap after GC | 0.79 MB | 0.77 MB |

A variant with only the `willReadFrequently` change still blocks for ≈4.4 s, because the first two builds halftone the placeholder scene through a GPU canvas. P2 and P3 are needed together.

### 3.4 Awaken GPU

Per-pass cost at 1440×900, scale 1, measured with a one-pixel read-back after each pass:

| Pass | Idle | Awake | Share |
|---|---|---|---|
| Scene (`SCENE`, RGBA16F, full resolution) | 482 ms | 530 ms | ≈70 % |
| Bloom (5 passes at 1/4 and 1/16) | 46 ms | 47 ms | ≈7 % |
| Composite, Ink on | 155 ms | 176 ms | ≈23 % |
| Composite, Ink off | 83 ms | 89 ms | Ink costs about half the composite |
| Scene with the P10 early-outs | 447 ms | 465 ms | −7 to −12 % |

Render-target and texture memory, computed from the code for a 1920×1080 CSS viewport:

| | Scale 1.0 | Scale 1.5 (start on DPR ≥ 1.5) | Scale 2.0 (reachable on 120 Hz, and the 4K button) |
|---|---|---|---|
| Scene RGBA16F | 16.6 MB | 37.3 MB | 66.4 MB |
| Back buffer RGBA8 | 8.3 MB | 18.7 MB | 33.2 MB |
| Bloom ×4 | 2.2 MB | 5.0 MB | 8.8 MB |
| Textures with mips (portrait 8.9, background 3.1, depth 3.1, mask 2.9) | 18.0 MB | 18.0 MB | 18.0 MB |
| **Total** | **≈45 MB** | **≈79 MB** | **≈126 MB** |

Main thread is not the bottleneck: 0.4 ms per frame idle, 2.6–3.0 ms while charging (style recalculation from `--p` and `--charge` on `:root`). JS heap 0.9 MB. Render targets are freed correctly on resize (`awaken.html:525`); the four textures are allocated once.

### 3.5 Mask "2+" (`mask-lab.html`, stage 518×691, GPU-process RSS, before → peak while charging)

| Variant | Run 1 | Run 2 |
|---|---|---|
| Original | 150 → 459 MB (+309) | 151 → 409 MB (+258) |
| Bounding-box pieces | 151 → 333 MB (+182) | 150 → 349 MB (+199) |
| Container filter removed (changes the look, for attribution only) | 149 → 288 MB (+139) | — |
| Both | 138 → 284 MB (+146) | — |

Frame rate holds 55–59 fps in every variant, so this is a memory problem, not a speed problem. About half the cost is the filter surface and the rest is the 84 layers themselves, which is why the DOM approach has a floor near +140 MB and the WebGL pass is the right home for it.

### 3.6 Robustness checks (original pages)

| Check | Result |
|---|---|
| Hold the panel with the page scrolled 160 px | During the 90 ms `body.impact` flash the shard box sits at y = −26 instead of 134 and the dark overlay at −160 instead of 0. A `filter` on `<body>` makes it the containing block for `position:fixed` children (`hero.html:138, 704–705`) |
| Status card: Tab once after it opens | Focus leaves to `<body>`; Escape then no longer closes it (the key handler is on the card, `hero.html:718`) |
| Hold Space or Enter on the panel for 1.8 s | Nothing. There is also no link to `awaken.html` anywhere in the hero DOM |
| `prefers-reduced-motion` on the hero, move the pointer over the panel | Canvas does not change: `loop()` is the only caller of `draw()` and it is gated by `!reduce` (`hero.html:523–525`) |
| `prefers-reduced-motion` on Awaken | Ignored apart from `.burst`; shake and the inverted impact frames still fire |
| WebGL2 unavailable | Message shows, but the script returns at `awaken.html:179`, so the status sheet stays `visibility:hidden` and the Sound button never gets a handler |
| Awaken tab order | Back, two dead anchors, then eight dev chips. The charge target (`#hit`) is a `<div>` with no keyboard access |
| Images blocked or slow | Hero prints the placeholder skyline and stick figure in screentone; Awaken shows the placeholder silhouette |
| Audio blocked | Fine: `ensure()` returns null or the context stays suspended; nothing throws |
| Contrast | Hero muted text 5.1:1 on paper, 4.6:1 in the footer. Awaken hint 5.9:1 on black but 3.6:1 where it overlaps violet glow, at 10.9 px |

---

## 4. Proposed structure for the real site

A static site is enough. Astro earns its place for three concrete reasons: one layout and one `StatusCard` component instead of two hand-synced copies, an image pipeline that produces the WebP/AVIF files from §3.1 at build time, and zero client JavaScript apart from the modules below. No UI framework is needed; the canvas and WebGL code stays plain modules. If you would rather not add a framework, the same tree works with Vite's multi-page mode.

```
portofolio/
├─ src/
│  ├─ pages/
│  │  ├─ index.astro            # hero, projects, contact
│  │  └─ awaken.astro
│  ├─ layouts/Base.astro        # <head>, fonts, sound toggle, reduced-motion flag
│  ├─ components/
│  │  ├─ StatusCard.astro       # one markup, two skins: silver (hero), violet (awaken)
│  │  ├─ Panel.astro            # screentone panel + hint + cracks svg
│  │  ├─ ProjectCard.astro
│  │  └─ Dock.astro
│  ├─ scripts/
│  │  ├─ screentone.js          # halftone, cleanTone, lens loop      (from hero.html)
│  │  ├─ shatter.js             # hold, cracks, shards                 (from hero.html)
│  │  ├─ shards.js              # shared triangulation (C5)
│  │  ├─ aura/
│  │  │  ├─ engine.js           # targets, passes, adaptive scale      (from awaken.html)
│  │  │  ├─ scene.frag  bloom.frag  composite.frag
│  │  │  └─ mask.js             # mask 2+ as triangles in the scene pass (P4)
│  │  ├─ sfx.js
│  │  └─ util.js
│  ├─ data/
│  │  ├─ portrait.json          # eye, chin, face width, mask box (C3)
│  │  └─ projects.json
│  ├─ assets/                   # sources: me.png, mask.png, frames, panel-2, bg-b, depth
│  └─ styles/tokens.css         # paper/ink/red and violet tokens, type scale
├─ public/sfx/                  # the three mp3 files in use
├─ tools/mask-fit.py            # reads data/portrait.json, writes layer-*.png
├─ labs/                        # mask-lab, cursor-lab, sound-lab, status-explore, moodboard …
│                               #   not deployed
└─ references/                  # 75 MB, keep out of the deploy and out of git LFS-free repos
```

---

## 5. Design and UX notes

Kept apart from performance; none of these change the look you chose.

**Placeholder content (fix before anything else is shown to anyone).** `[CITY]` (`hero.html:210`), `[Your stack]` (`:287`, `awaken.html:129`), `[PROJECT NAME]` and `[SCREENSHOT OF YOUR PROJECT]` (`hero.html:251–253`), `2 of [N]` (`:247`), `[YOUR EMAIL]` (`:268`, and the copy button copies that literal text). Dead anchors: `#resume`, `#p1`, `#p2`, `#github`, `#linkedin` on the hero; `#work` and `#contact` on Awaken (`awaken.html:133–134`) point at sections that do not exist on that page, so its two main buttons do nothing. They should go to `./#projects` and `./#contact`.

**Discoverability.**
- The only place that says "click" is the hint chip, which appears on hover (`hero.html:73–74, 216`). The always-visible label says "hover to reveal · hold to awaken" (`:220`) and leaves out click. On a phone "hover" means nothing and the chip never shows. Use one line chosen by pointer type: "tap for status · hold to awaken" for coarse pointers, "click for status · hold to awaken" for fine.
- The panel's accessible name is "Open Justin's status card" (`:214`); a screen-reader user never learns Awaken exists.
- Show the hint chip once for about three seconds on a first visit (the `jt-visited` flag at `hero.html:335` already exists).
- Awaken's hint sits across the top of the head at 21 % (`awaken.html:17–18`), 10.9 px, letter-spaced, 3.6:1 against the glow. Move it under the figure or into the bottom bar where the dev chips are now, and raise it to at least 12 px.

**Layout and responsiveness** (screenshots in `prototype/review/measure/shots/`).
- Phone (390×844), Awaken: the fixed controls bar covers the Mana and Skills rows of the status sheet at first paint and stays over whatever is at the bottom. C10 removes the cause.
- Phone, hero: the sub-label wraps to "…currently open to / opportunities"; break it deliberately after the city, or shorten it. Projects, About and Contact vanish from the header below 600 px (`hero.html:51`); the dock covers for it, which works, but the header is then only "Résumé" and the sound pill.
- 1920 and wider: the panel stops at 420 px and the headline at 84 px (`hero.html:58, 69`), so at 2560×1440 the hero is the same size as at 1440 with more paper around it. Let the panel grow with height, for example `width: clamp(250px, min(29vw, 46vh), 540px)`. Slight visual change at large sizes only.
- Tablet portrait (820×1180), Awaken: works; the same controls-bar overlap applies to the two buttons.

**Polish next to the reference sites.**
- Awaken ships with a debug HUD, four colour themes, a Quality switch and two upload buttons whose emoji icons render as empty boxes on systems without colour emoji. The reference sites show one deliberate centrepiece and nothing that looks like a settings panel. Keep Sound, and Ink if you want it, as small top-right pills matching the hero's sound pill.
- At rest (aura 5–7 %) the ink smoke forms a solid dark lump around and above the head; in a still frame it reads as a hood. It resolves once you hover. Worth a look on your own screen; changing it would be a visual change, so I am only flagging it.
- "Try your own art" (`hero.html:221–222`) puts a file-upload control in the hero of a personal site. It is the demo for the Screentone project; it would be stronger on that project's card or page, leaving the hero with one job.
- The hero says "Sound off", Awaken says "Sound: Off". Pick one.
- `개발자` under the name on Awaken (`awaken.html:119`) is a subtitle, not sound-effect text, so it is not what you rejected; it is the only Korean on either page and costs a font request, so confirm it is intentional.
- When the status card opens, focus lands on the close button and draws a red ring around the X. Correct behaviour, but it is the loudest thing on the card; an ink-coloured ring at that one spot would sit better with "red only for the failed measurement".

**Accessibility fixes, in order.**
1. Keyboard path to Awaken: on the panel, hold Space or Enter to run the same `holdLoop` (key-repeat guarded), and add a plain link to `awaken.html` in the dock or footer.
2. Status card: use `<dialog>` with `showModal()` (focus trap, Escape and `inert` background for free) or set `inert` on `<header>`, `<main>` and `<footer>` while it is open. Move the Escape handler to `document`.
3. Reduced motion on the hero: call `draw()` directly from `pointermove` with the lens snapped to the pointer, so the reveal still works without the animation loop.
4. Reduced motion on Awaken: skip the canvas shake (`awaken.html:689`) and the two inverted impact frames (`:756`), which are a flash risk; keep the aura itself.
5. Impact flash: replace `body.impact{filter:…}` with a fixed full-screen element using `backdrop-filter: invert(1) contrast(1.4)`. Same picture, and fixed children stop jumping.
6. No WebGL2: run `sheetIn()` and the sound wiring before the `return` at `awaken.html:179`, and give `#gl` a static fallback (a still of the scene as a CSS background).
7. Awaken: make `#hit` a `<button aria-label="Hold to charge, release to burst">` with the same key handling as the panel, and give the sheet `role="group"` so its `aria-label` is announced.
