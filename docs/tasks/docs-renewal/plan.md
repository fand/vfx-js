# VFX-JS docs renewal: plan

Turn `packages/docs` (one long `index.html` on Vite) into a multi-page Astro site, like `packages/docs-transitions`.

## Goal

- Top page stays a showcase: hero, spheres BG, effect menu (already on this branch).
- Docs live on separate pages with a shared header and sidebar.
- Page moves use a VFX-JS transition (`@vfx-js/astro`).
- URLs stay under `amagi.dev/vfx-js/`. Keep `docs/` (TypeDoc), `storybook/`, `examples/`, `llms.txt`, `llms-full.txt` where they are.

## Pages

| Path | Page | Sections (draft) |
|---|---|---|
| `/` | Top | Hero, short pitch, links to each page |
| `/getting-started/` | Getting Started | Install (npm / CDN), first effect, `data-*` attributes, frameworks (React / Vue / Svelte / Astro), next steps |
| `/how-it-works/` | How it Works | DOM stays DOM (canvas overlay), element capture (img / video / text / html-in-canvas), overflow, scroll and visibility, uniforms and timing, limits |
| `/ai/` | Use with AI | Install the skill, `llms.txt` / `llms-full.txt`, prompts that work, write a shader with AI, check the result |
| `/effects/` | Effects | Shader presets, parameters, `@vfx-js/effects` gallery (live demos), chaining, link to Storybook |
| `/shaders/` | Custom Shaders | GLSL template, built-in uniforms, custom uniforms, overflow, multipass (`docs/MULTIPASS.md`), post effects |
| `/custom-effects/` | Custom Effects | Effect API, lifecycle hooks, `EffectTexture`, examples (`docs/EFFECT.md`, `docs/POSTEFFECT_EXAMPLE.md`) |

Transitions: link out to `amagi.dev/vfx-js-transitions/`. No copy.

Footer on every page: author section ("Made by Amagi", profile, social links), moved from the current top page.

## Stack: Astro

Why Astro over Next (measured, gzip):

- Next (`docs-transitions` `/getting-started`): ~241 KB JS, full React hydration.
- Astro (`framework-testbed/astro`): ~63 KB JS, of which core is ~55 KB. No hydration.
- Less main-thread work next to WebGL init; matters on pages with many demos.
- Transitions: `@vfx-js/astro` + `<ClientRouter />` is a supported path. `@vfx-js/react/next` uses Next internals.

Setup:

- `output: "static"`, `outDir: "dist"`, `base: "/vfx-js"`, `trailingSlash: "always"`.
- Pages in `src/pages/*.astro`; long prose in `.mdx` (`@astrojs/mdx`).
- Code blocks: Astro's built-in Shiki. Drop Prism.
- Dev: alias `@vfx-js/core` to source like the current `vite.config.ts`.
- Keep the package name `docs` so turbo, CI and deploy workflows keep working.

Transitions:

- `Layout.astro` holds `<ClientRouter />` and `<VFXTransition>` around `<main>`.
- Header, sidebar and BG stay outside `<main>` (`transition:persist`), so the spheres BG keeps running.
- Set up page demos on `astro:page-load`; dispose them on `astro:before-swap`.
- Respect `prefers-reduced-motion` (`duration: 0`).

## Content sources

- Current `index.html` sections: Usage → Getting Started; Presets / Parameters → Effects; Custom Shaders / Multipass → Custom Shaders; Effects → Effects + Custom Effects; Transitions → link out; Author → footer.
- `skills/vfx-js/SKILL.md` and `references/*.md`: facts for every page; keep pages and skill in sync.
- `docs-transitions/app/ai/page.tsx`: structure for the AI page.
- `docs-transitions/app/how-it-works/page.tsx`: structure for How it Works.
- `docs-transitions/app/_components/`: port `doc-sidebar`, `code-tabs`, `page-frame` to `.astro`.

## Steps

1. Astro scaffold
   - Replace Vite setup in `packages/docs` with Astro; keep `scripts/` and `public/`.
   - Build scripts: `astro build`, then copy TypeDoc / Storybook / examples into `dist/`, then `build:llms`.
   - Check `pnpm --filter docs build` output matches today's `dist/` layout.
   - Update the Cloudflare preview workflow (see Preview).
2. Layout
   - `Layout.astro`: head / OG tags per page, header (Getting Started, How it Works, AI, Effects, Shaders, API, GitHub), sidebar with scroll spy.
   - Footer with the author section from the current `AuthorSection`.
   - Split `index.css` into global / layout / page styles.
   - Move `spheres-bg.ts` into a persisted BG component.
3. Top page
   - Port hero and effect menu from `src/main.ts`.
   - Remove Usage / Examples / Author sections; add cards linking to each docs page.
4. Getting Started page
5. Effects page
   - Live demos with one shared `VFX` instance; lazy-init demos when in view.
   - Effect gallery driven by a list in `src/effects-list.ts`.
6. How it Works page
   - Inline SVG diagrams for overlay canvas and overflow. Reuse `docs/effect-dims.svg`.
7. AI page
8. Custom Shaders page
   - One live demo per topic (uniforms, overflow, multipass).
9. Custom Effects page
   - Port examples from `docs/EFFECT.md`; one live demo per hook.
10. Page transitions
   - Add `<VFXTransition>` to the layout; pick a preset; set back = `reverse`.
   - Check that demos inside `<main>` freeze only during the run and restart after.
11. Wiring
   - Old `#examples` anchor → redirect script to `/effects/`.
   - Update `public/llms.txt` with page URLs if useful.
12. Check
    - `pnpm --filter docs build` and `preview`; check all pages, TypeDoc / Storybook / examples links.
    - Transitions in Chrome, Safari, Firefox (Safari / Firefox have no `moveBefore`; not checked yet).
    - Cloudflare preview works under `/vfx-js/` (see Preview below).
    - Mobile layout; one WebGL context per page; no leaked `VFX` after page moves.
    - Lighthouse on top and Effects pages.
    - `pnpm --filter docs test` still passes.

Each step = one commit. Steps 4–9 can go in any order.

## Preview

`base: "/vfx-js"` makes links absolute, so the preview must serve docs under `/vfx-js/` like production.

- In `preview-cloudflare-pages.yml`: copy `packages/docs/dist` to `preview/vfx-js/` and the transition demo to `preview/vfx-js-transitions/`; deploy `preview/`.
- Add `/vfx-js/` to the PR comment URLs (Top, Examples, Storybook, Docs).
- Do this in step 1, so every later PR gets a working preview.
