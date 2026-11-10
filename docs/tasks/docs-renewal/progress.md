# Docs renewal: progress

PR #249 (`docs/vfx-js-docs`). All steps in `plan.md` are done.
Details are in the PR description and git history.

## Done

- Astro site in `packages/docs` (base `/vfx-js`), with TypeDoc, Storybook and examples copied into `dist/` and served in `astro dev`.
- Pages: Getting Started, How it Works, Use with AI, Effects, Custom Shaders, Custom Effects, 404.
- Header (Docs, Examples, GitHub), sidebar with scroll spy, footer (logo, link columns, author icons).
- Top page: hero with effect menu, code rows with live demos, Why VFX-JS features grid.
- BG: glass spheres (layout on the CPU) and cosine-spectrum noise. Past the hero and on doc pages, the BG drops its effect and dims.
- Page transitions: `<VFXTransition>` with slitScan and `autoReverse`. Pages scroll inside `.Page`; `src/lifecycle.ts` restores scroll on back, forward and reload.
- Redirects for old top-page hashes, canonical links, sitemap, `llms.txt` guide links.
- Biome and `astro check` run for the docs package.
- Cloudflare preview serves docs under `/vfx-js/`.
- Merged main (#239–#252): `*Reveal` preset names, `enterProgress` / `leaveProgress`, `intersection` `duration` / `leaveThreshold`, reduced motion, `autoReverse`.

## Not checked

- Page transitions in Safari and Firefox (no `moveBefore`).
- Back passes `reverse: true` with `autoReverse`. Only seen in screenshots.
- Top page Lighthouse after the top page and BG changes. Last run: CLS 0.65 (intro masks, effect menu), TBT about 1 s.

## Open in this PR

- Trail demo on Custom Effects is clipped at 375px.
- `amagi.png` is 960px but shows at 128px. A 256px WebP saves about 80 KB.
- Unused files in `public/`: `cat.gif`, `logo.png`, `nyancat.gif`, `octocat.gif`, `threads.svg`, `vfx-js-blob.webp`, `vfx-js-logo-white.svg`, `vfx-js-logo.svg`, `vfx-js-top-blob.png`. Old links may point at them.
- With reduced motion, the top page effect menu does nothing and says nothing.
- Top page logo shader still uses `enterTime` / `leaveTime`. It works.

## Outside this PR

- `ParticleExplodeEffect` burst wipes earlier elements (`packages/effects/src/particle-explode.ts`).
- Core JSDoc does not match the code: `release` default, `EffectRenderTargetOpts.size`, `EffectDrawOpts.target`.
- `ElementRect` is not exported from core.
- Skill blit feedback example may map wrong with padded buffers.
- `/examples/` floods the console with `GL_INVALID_FRAMEBUFFER_OPERATION` (`packages/examples`).
- `@vfx-js/transitions` ESM build warns about `"use client"` when bundled.
- Rethink the `time` uniform spec.
- Move scroll restore into `@vfx-js/astro`. `lifecycle.ts` wraps the swap of `<VFXTransition>` by listener order, which is fragile.
- GitHub Pages reads `404.html` and `robots.txt` only at the domain root.
