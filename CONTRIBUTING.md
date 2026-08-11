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
| `pnpm dev`   | Start dev mode for all packages   |
| `pnpm build` | Build all packages                |
| `pnpm lint`  | Lint all packages                 |
| `pnpm test`  | Run tests                         |
| `pnpm clean` | Remove build artifacts            |

To work on a single package, use `pnpm --filter <package> run <command>`.

## Packages

| Package                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `packages/vfx-js`       | `@vfx-js/core` — core library            |
| `packages/react`        | `@vfx-js/react` — React bindings         |
| `packages/react-vfx`    | `react-vfx` — compat wrapper             |
| `packages/effects`      | `@vfx-js/effects` — prebuilt effects     |
| `packages/docs`         | Documentation website                    |
| `packages/docs-react`   | Documentation website for React bindings |
| `packages/examples`     | Example gallery                          |
| `packages/storybook`    | Component stories                        |

## Code Style

Formatting and linting are handled by [Biome](https://biomejs.dev/) (4-space indent).
A pre-commit hook formats staged files, so you rarely need to run it manually.

## Sending a Pull Request

1. Create a branch from `main`.
2. Make your change, and add tests if it affects `@vfx-js/core`.
3. Run `pnpm build && pnpm lint && pnpm test`.
4. If your change affects a published package, run `pnpm changeset` and commit the generated file.
5. Open a pull request and make sure CI passes.

## Bugs and Questions

- Bug reports and feature requests: [Issues](https://github.com/fand/vfx-js/issues)
- Questions and showcases: [Discussions](https://github.com/fand/vfx-js/discussions)
