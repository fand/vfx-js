# Contributing to VFX-JS

Thanks for your interest in VFX-JS!

## Getting Started

Requires Node.js 24 and [pnpm](https://pnpm.io/) (the version is pinned in `packageManager`).

```sh
git clone https://github.com/fand/vfx-js.git
cd vfx-js
pnpm install
pnpm dev
```

## Commands

| Command      | Description                       |
| ------------ | --------------------------------- |
| `pnpm dev`   | Start the docs and demo sites, and watch the libraries they use |
| `pnpm build` | Build all packages                |
| `pnpm lint`  | Lint all packages                 |
| `pnpm test`  | Run tests                         |
| `pnpm clean` | Remove build artifacts            |

To work on a single package, use `pnpm --filter <package> run <command>`.

## Packages

| Package                      | Description                                |
| ---------------------------- | ------------------------------------------ |
| `packages/vfx-js`            | `@vfx-js/core` — core library              |
| `packages/effects`           | `@vfx-js/effects` — prebuilt effects       |
| `packages/transitions`       | `@vfx-js/transitions` — transition presets |
| `packages/react`             | `@vfx-js/react` — React bindings           |
| `packages/react-vfx`         | `react-vfx` — compat wrapper               |
| `packages/vue`               | `@vfx-js/vue` — Vue bindings               |
| `packages/svelte`            | `@vfx-js/svelte` — Svelte bindings         |
| `packages/astro`             | `@vfx-js/astro` — Astro components         |
| `packages/docs`              | Documentation website                      |
| `packages/docs-react`        | Documentation website for React bindings   |
| `packages/docs-transitions`  | Transitions website                        |
| `packages/examples`          | Example gallery                            |
| `packages/storybook`         | Component stories                          |
| `packages/framework-testbed` | Test apps for the framework bindings       |

## Code Style

Formatting and linting are handled by [Biome](https://biomejs.dev/) (4-space indent).
A pre-commit hook formats staged files, so you rarely need to run it manually.

## What Goes Into Core

`@vfx-js/core` gives effects the low-level tools they need. It is not a 3D engine.

- **Core adds low-level features that effects can't work around.**
  Examples: depth buffers, MSAA, multiple render targets.
- **Effect authors own everything they can build on top.**
  Examples: materials, lighting, model loading, FXAA, TAA.
- **Helpers may come later, but not in core.**
  They belong in `@vfx-js/effects` or a new package.

To decide, ask: can an effect author build this with the current `EffectContext` API?

- **Yes**: keep it out of core.
- **No**, because it needs GPU state or resources the API hides: it belongs in core.

A feature that doesn't belong in core can still ship.
If people want it, we can offer it in `@vfx-js/effects` or as another helper.

## Sending a Pull Request

1. Create a branch from `main`.
2. Make your change, and add tests if it affects `@vfx-js/core`.
3. Run `pnpm build && pnpm lint && pnpm test`.
4. If your change affects a published package, run `pnpm changeset` and commit the generated file.
5. Open a pull request and make sure CI passes.

## Bugs and Questions

- Bug reports and feature requests: [Issues](https://github.com/fand/vfx-js/issues)
- Questions and showcases: [Discussions](https://github.com/fand/vfx-js/discussions)
