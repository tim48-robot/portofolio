# Awaken page: research and upgrade plan

The separate page (`/awaken`) built from `aura-awakening.html`. Reached by holding the hero panel; also listed as a project.

Prototype with the experiments below: `prototype/awaken.html`, published at https://claude.ai/artifact/PtkfTMM1jxVv7aDTh1GMRj (with `bg-b.webp`). Locally, open it through a server (`python3 -m http.server`) so the background loads.
Screenshots: `references/awaken/`.

## Background choice

| | A (`bg-a.webp`, 1672×941) | B (`bg-b.webp`, 1024×572) ⭐ |
|---|---|---|
| Look | Painterly anime, rich violet | Clean ink lines, flat tones, screentone |
| Feels hand-drawn? | Less: mushy clouds, random rebar, generic "AI anime wallpaper" | More: readable shapes, clear perspective |
| Fits our site | Matches the aura colour | Matches the ink/screentone language of the main page |
| Problems | Low contrast, monochrome mush | Low resolution, a bit "western comic", empty flat rooftop on the right, fake text on signs |

Pick B, regenerate at higher resolution with the fixes in the prompt, then upscale 2–4× with an anime/line-art model (Real-ESRGAN anime 6B or Real-CUGAN, both free in Upscayl).

## Upgrades, ranked by impact

1. ✅ **Ink mode** (toggle "Ink: On/Off"): hard tone steps, Sobel ink contours, screentone in mid-tones. The scene shader writes an effects mask into alpha, so ink only lands on the aura, seal and portrait; the background stays clean.
2. ✅ **Cel-stepped flames**: in ink mode the flames snap to 3 hard bands.
3. ✅ **2.5D depth parallax** (`bg-b-depth.png`, made locally with Depth Anything V2 Small): make a depth map of the background once (Depth Anything V2, e.g. via the in-browser tool `tiefling`), ship it as a small grayscale PNG, and offset the background by depth with the mouse and during the shake.
4. **Aura light wraps the body**: derive a normal map from the portrait's blurred alpha and light its edges from the aura colour (rim light), plus a tiny hand-painted eye-glow mask.
5. ✅ **Sound** (off by default, toggle "Sound"): Web Audio white noise through a band-pass filter with a rising sweep while charging, a low boom on release. No audio files needed.
6. **Performance**: AVIF/WebP images, load the page's assets only when `/awaken` opens, keep adaptive resolution, pause when hidden.

## Also done (2026-11-02)

- Hold the hero panel: cracks grow from your finger (~1.3s), a one-frame inverted impact, the panel shatters toward the viewer, the page goes dark, then `awaken.html` opens. A short click still opens the status card. Back button restores the panel.
- Release on Awaken: the Korean sound-effect text is gone, replaced by black manga focus lines bursting from the figure (drawn behind the text).
- New status window on both pages: chamfered double frame, header with a "!" badge between two rules, opens like a line of light, rows fade in one by one. Ink/paper version on the hero, holographic purple version on Awaken (floats tilted, straightens on hover).

## Status window redesign (2026-11-08)

Study board: `prototype/status-explore.html` (https://claude.ai/artifact/7k5MYepfyPeTL6kQPdize9), built from the 55 references in `references/system-ui/`.
Chosen system: **A · Violet Sheet** on Awaken (the window is a sheet of violet light, Barlow Condensed caps, one ruled title, amber only for moving values, pixel-assemble reveal + optional ding) and **D · Ink Print** on the hero (same type, order and rule, printed in ink with a screentone shadow, red only for "Measurement failed").

## Sources

- Toon fire: https://papaya-games.itch.io/duck-in-town/devlog/95149/how-to-make-an-stylized-fire-shader
- Stylized fire (MIT): https://godotshaders.com/shader/stylized-fire-3d/
- Moebius-style post-processing (outlines): https://blog.maximeheckel.com/posts/moebius-style-post-processing
- Painterly / Kuwahara: https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders
- Dithering and retro shading: https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web
- Depth parallax in the browser: https://github.com/combatwombat/tiefling
- Anime speed lines shader: https://godotshaders.com/?p=16778
- Real-ESRGAN anime models: https://github.com/xinntao/Real-ESRGAN/blob/master/docs/anime_model.md
- Web Audio noise + filters: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
