# Justin Timothy, portfolio

Static site built with [Astro](https://astro.build) and TypeScript. Two pages: the paper hero (`/`) and the
WebGL "Awaken" page (`/awaken`).

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # type check + static build into dist/
npm run lint     # ESLint + Prettier check
```

Needs Node 22.12 or newer (Astro is pinned to 7.3.x so it runs on Node 22.21).

## Where things are

- `src/content/` — all text and project data (`site.ts`, `projects.ts`)
- `src/components/` — `ui/` small reusable pieces, `sections/` page sections
- `src/scripts/` — browser code: hero panel and shatter, Awaken WebGL engine and shaders, sound, sword cursor
- `src/lib/` — pure helpers (portrait geometry, shatter geometry, image URLs)
- `src/assets/` — source images (optimised to WebP at build time)
- `public/` — fonts, sounds, cursors, Cloudflare `_headers`
- `tools/make-panel.py` — renders the hero panel (screentone + colour); rerun after changing the portrait
- `tools/fetch-fonts.py` — downloads the self-hosted font files
- `prototype/` — the original HTML prototypes, kept as reference only

## Deploy

Cloudflare Pages, build command `npm run build`, output directory `dist`.
