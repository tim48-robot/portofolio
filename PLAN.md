# Portfolio plan

## Direction (updated 2026-10-29)

Manhwa-themed **visuals**, plain **words**. It looks like a webtoon, but it reads like a normal, sharp developer portfolio.

Rule: 80% clean and professional, 20% manhwa personality, kept to a few places.

## Page

1. **Intro (about 2s, once per visit, skippable)**: the page starts as a flat webtoon panel. It cracks, then shatters into 3D shards that fly toward the viewer. Three.js + GSAP.
   Technique reference: https://freefrontend.com/code/shattering-image-gallery-transition-2026-03-05/
2. **Hero (default state)**: one high-quality webtoon-style illustration (Lookism / How to Fight energy). It must be an original character, ideally me as a manhwa character. Placeholder: a ChatGPT draft. Final: a commissioned illustration.
3. **About = status window**: kept from the first prototype. The name is still open (Timothy48?).
4. **Projects**: clean cards, plain descriptions.
5. **Contact**: simple. At most one small System-style message on send.
6. **Cat in the corner**: later, once there's a well-designed cat (ChatGPT design → Rive, or a commissioned one).

## Style decision (2026-10-29)

Mockup styles A (Street Ink) and C (Clean Editorial) are liked; B (System Dark glow) was rejected as "AI slop".

## Reference sites (screenshots in references/websites/)

| Site | What to take |
|---|---|
| andrewaryo.com | Soft spring motion on every hover/click, fade-in page intro, footer icons that pop and tilt on hover (Framer Motion) |
| frvky.online | The whole site is a familiar interface (macOS lock screen → desktop + dock). Interacting is how you navigate |
| cindyly.design | One 4K interactive centrepiece (tamagotchi fish) splitting the headline; mixed type: sans + italic serif emphasis + mono labels; a small dock (works / quests / profile). Built with Astro |
| tomjohn.design | A living world with a tiny avatar of himself, "Welcome back" for returning visitors. Too much overall, but the personal avatar and remembering visitors are worth stealing |
| ysuriadesign.com | One huge central image dominating the hero, big confident type, testimonial marquee, footer with scenic image + huge "Let's ship it." |
| shubhu.site | Hero image run through ONE filter (dithered blue Mona Lisa, made with his own tool) that reacts to the cursor; pixel-serif headline whose letters resolve from blur, mixing outline and solid letters; project cards on consistent illustrated backgrounds; footer of pixel flowers; Cal.com booking embed; handwritten greeting logo |

Common thread: each site has ONE high-quality, interactive centrepiece made from real rendered art, and everything around it stays quiet and typographic.

## Copy rules

- Write normal sentences, not manhwa jargon. No "Episodes", "Constellations", "Hidden Quest", "Reader".
- The manhwa feel comes from the art, panel framing, lettering and motion.

## Dropped

Nunchaku action panel, storyboard episodes, fake crowd panel, Constellation messages,
SpongeBob cards, romance mode, apocalypse prologue, fake terminal.

## Not in the portfolio yet

GSoC work stays out until I decide otherwise.

## Tooling

- Playwright MCP is installed (user scope) so Claude can screenshot and check pages.
- References go in `references/` (system-ui, manhwa-panels, websites, typography, cat, hero).
- Framework still to decide; Astro + Three.js + GSAP is the current favorite.
