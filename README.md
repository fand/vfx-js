<div align="center">
  <a href="https://amagi.dev/vfx-js/" target="_blank"><img width="100%" alt="VFX-JS Screenshot" src="https://github.com/user-attachments/assets/b50ebede-e1e0-4b35-8b15-5e8ec392bfa2" /></a>
  <h1>VFX-JS: WebGL effects for HTML.</h1>
  <a href="https://www.npmjs.com/package/@vfx-js/core"><img src="https://img.shields.io/npm/v/@vfx-js/core" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@vfx-js/core" alt="MIT License"></a>
  <a href="https://github.com/fand/vfx-js" target="_blank"><img src="https://img.shields.io/github/stars/fand/vfx-js" alt="Star on GitHub"></a>
  <br/>
  <br/>
  <a href="https://amagi.dev/vfx-js/">Website</a> ·
  <a href="https://amagi.dev/vfx-js-transitions/">Transitions</a> ·
  <a href="https://amagi.dev/vfx-js/examples">Examples</a> ·
  <a href="#documentation">Docs</a>
  <br/>
  <br/>
</div>

VFX-JS adds WebGL effects to the elements of your website.
Attach a shader to an `<img>`, a `<video>` or a block of text, or run the
live DOM through a shader when a page changes.

<!-- TODO: demo GIFs, one for an element effect and one for a page transition. -->

- **Element effects.** Glitch, bloom, pixelate, halftone and more on images,
  videos and text. Stack them, or write your own in GLSL.
- **Page transitions (new).** Glitch, pixel sort, datamosh and more between
  pages or tabs. VFX-JS captures the live DOM, so it works on your real
  markup, and the element is plain DOM again when the run ends.
  See the [transitions site](https://amagi.dev/vfx-js-transitions/).
- **Any framework.** Plain JS, plus bindings for React, Vue, Svelte and Astro,
  with router support for Next.js, React Router, Nuxt, Vue Router, SvelteKit
  and Astro.

## Quick start

### Element effects

```sh
npm i @vfx-js/core
```

```js
import { VFX } from "@vfx-js/core";

const img = document.querySelector("#img");

const vfx = new VFX();
vfx.add(img, { shader: "glitch", overflow: 100 });
```

Or compose effects from [`@vfx-js/effects`](https://www.npmjs.com/package/@vfx-js/effects):

```js
import { VFX } from "@vfx-js/core";
import { BloomEffect, PixelateEffect } from "@vfx-js/effects";

const vfx = new VFX();
vfx.add(img, {
    effect: [new PixelateEffect({ size: 10 }), new BloomEffect({ intensity: 5 })],
});
```

### Page transitions

```sh
npm i @vfx-js/core @vfx-js/transitions
```

```js
import { VFX } from "@vfx-js/core";
import { Swipe } from "@vfx-js/transitions";

// <div id="panel"> holds one <section> per tab, all but one hidden.
const vfx = new VFX();
const panel = document.querySelector("#panel");
const t = vfx.addTransition(panel, { transition: Swipe, duration: 0.6 });

for (const tab of document.querySelectorAll("[data-panel]")) {
    tab.addEventListener("click", () => t.show(tab.dataset.panel));
}
```

For page navigation, wrap your router outlet in `<VFXTransition>`.
[Getting Started](https://amagi.dev/vfx-js-transitions/getting-started) has
the setup for each framework.

## Packages

| Package | Description |
| --- | --- |
| [`@vfx-js/core`](packages/vfx-js) | The `VFX` class: element effects and transitions |
| [`@vfx-js/effects`](packages/effects) | Ready-made effects |
| [`@vfx-js/transitions`](packages/transitions) | Transition presets |
| [`@vfx-js/react`](packages/react) | React components and hooks, with Next.js and React Router support |
| [`@vfx-js/vue`](packages/vue) | Vue components and directives, with Nuxt and Vue Router support |
| [`@vfx-js/svelte`](packages/svelte) | Svelte components and attachments, with SvelteKit support |
| [`@vfx-js/astro`](packages/astro) | Astro components |
| [`react-vfx`](packages/react-vfx) | Old name of `@vfx-js/react`, kept for compatibility |

## Documentation

- [Website](https://amagi.dev/vfx-js/): usage, shader presets, effects and examples
- [Transitions site](https://amagi.dev/vfx-js-transitions/): setup, presets, custom transitions and a playground
- [React docs](https://amagi.dev/react-vfx-docs/)
- [Effect API](docs/EFFECT.md): write your own effects
- [Multipass shaders](docs/MULTIPASS.md)
- [Transition API](docs/TRANSITION.md)
- [HTML-in-Canvas](docs/html-in-canvas.md): effects on any HTML element

## Browser support

VFX-JS needs WebGL. Without it, `VFX.init()` returns `null`, so you can
leave the page as plain HTML. When the user prefers reduced motion, VFX-JS renders
nothing, and transitions cut to the new content.

Effects on `<img>` and `<video>` work the same in every browser.
For text, other HTML and transitions, VFX-JS has to capture the DOM:

- With [HTML-in-Canvas](docs/html-in-canvas.md), the browser draws the
  element itself, so the capture matches the page. The API is still
  experimental and is only in Chrome Canary, or Chrome behind a flag.
- Elsewhere, VFX-JS clones the element and draws it as an SVG image. This
  is a workaround and can't match the page exactly. Web fonts,
  `::before` / `::after` and `<canvas>` content, among others, don't make
  it into the capture.

See [Limitations](https://amagi.dev/vfx-js-transitions/limitations) for the
full list.

## Use with AI agents

Install the VFX-JS skill for Claude Code, Codex, Cursor and other agents:

```sh
npx skills add fand/vfx-js
```

Or point your agent to [llms.txt](https://amagi.dev/vfx-js/llms.txt) / [llms-full.txt](https://amagi.dev/vfx-js/llms-full.txt).

## Development

Requires Node.js 24 and [pnpm](https://pnpm.io/).

```sh
git clone https://github.com/fand/vfx-js.git
cd vfx-js
pnpm install
pnpm dev
```

`pnpm dev` starts the docs and transitions sites and watches the libraries
they use. `pnpm build`, `pnpm lint` and `pnpm test` run across all
packages. See [CONTRIBUTING.md](CONTRIBUTING.md) before you send a pull
request.

## Author

[AMAGI](https://twitter.com/amagitakayosi)

## License

MIT
