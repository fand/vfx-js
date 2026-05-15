# `react-vfx` → `@vfx-js/react` Rename Migration Design

**Date:** 2026-05-14
**Status:** Approved (design)
**Scope:** Renaming the React package from `react-vfx` to the scoped `@vfx-js/react` as part of the `@vfx-js/core` v1.0 release.

---

## 1. Goals and Non-Goals

### Goals

- Rename the React package from `react-vfx` to `@vfx-js/react`, aligned with the `@vfx-js/core` v1.0 release.
- Keep existing `react-vfx` users working without code changes by providing a migration path via a thin wrapper package (npm has no true package redirect, so we simulate one).

### Non-Goals

- Long-term maintenance of the legacy `react-vfx@0.18.x` API.
- Automated migration (codemod) for `react-vfx@0.x` users.

---

## 2. Overall Strategy

### 2.1 Approach

**Thin wrapper package (pseudo-redirect) + simultaneous major version bump.**

- Publish `@vfx-js/react@1.0.0` as the new primary package (with the new API).
- Publish `react-vfx@1.0.0` as a wrapper that only re-exports from `@vfx-js/react@1.0.0`.
- Both packages share the same new API; the legacy 0.x API is not preserved on the wrapper.
- Users who want to keep using the legacy API can pin to `react-vfx@0.18.x`.

### 2.2 Maintenance Strategy

- At release time, do **not** call `npm deprecate`. The wrapper works silently.
- The wrapper is published in lockstep with future `@vfx-js/core` / `@vfx-js/react` major releases for the foreseeable future.
- At a later, judgment-based moment, run `npm deprecate react-vfx@"<2.0.0" "..."` to surface an install-time warning.

---

## 3. Package Layout

### 3.1 Final Directory Structure

```
packages/
├── vfx-js/         (= @vfx-js/core@1.0.0)         existing
├── react/          (= @vfx-js/react@1.0.0)        moved from react-vfx/ via git mv
├── react-vfx/      (= react-vfx@1.0.0, wrapper)   newly created
├── docs/                                           existing
├── docs-react/     (= renamed from docs-react-vfx via git mv)
├── effects/                                        existing
├── examples/                                       existing
└── storybook/                                      existing
```

### 3.2 Rename Steps

- `git mv packages/react-vfx packages/react` to preserve history.
- `git mv packages/docs-react-vfx packages/docs-react` to preserve history.
- After the moves, create a new `packages/react-vfx/` directory dedicated to the wrapper.

### 3.3 `@vfx-js/react` Package (`packages/react/`)

Inherits the previous `react-vfx` source while updating `package.json` and related config.

Key `package.json` changes:

- `"name": "react-vfx"` → `"name": "@vfx-js/react"`
- `"version": "0.18.0"` → `"version": "1.0.0"`
- `"dependencies": { "@vfx-js/core": "0.13.0" }` → `"dependencies": { "@vfx-js/core": "1.0.0" }`
- Other fields (`peerDependencies`, `exports`, `scripts`, `files`, `keywords`, etc.) carry over as-is.
- `homepage` / `repository` / `bugs` URLs stay the same (monorepo URL is unchanged).

Source code under `src/` follows the new `@vfx-js/core` v1.0 API. The exact API changes are out of scope for this spec and are defined in a separate document.

### 3.4 `react-vfx` Wrapper Package (`packages/react-vfx/`)

A newly created minimal package containing only the following:

```
react-vfx/
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.esm.json
└── src/
    └── index.ts        # export * from "@vfx-js/react";
```

#### `package.json` Specification

```jsonc
{
  "name": "react-vfx",
  "description": "Renamed to @vfx-js/react. This package re-exports @vfx-js/react for backward compatibility.",
  "version": "1.0.0",
  "type": "module",
  "main": "./lib/esm/index.js",
  "types": "lib/esm/index.d.ts",
  "exports": {
    "require": {
      "types": "./lib/cjs/index.d.ts",
      "default": "./lib/cjs/index.js"
    },
    "import": {
      "types": "./lib/esm/index.d.ts",
      "default": "./lib/esm/index.js"
    }
  },
  "files": ["package.json", "README.md", "lib/"],
  "scripts": {
    // Same dual ESM/CJS build setup as packages/react/ (tsc + tsconfig-to-dual-package).
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@vfx-js/react": "1.0.0"  // exact pin, lockstep
  }
}
```

#### `src/index.ts`

```ts
export * from "@vfx-js/react";
```

`export *` carries both runtime values and types. If any named exports are not picked up (verified during implementation), add explicit `export type *` as needed.

#### `README.md`

Short deprecation-notice style document covering:

- "This package has been renamed to `@vfx-js/react`."
- Install commands (`npm uninstall react-vfx && npm install @vfx-js/react`).
- Import rewrite example.
- Link to the migration guide.
- Instructions to pin `react-vfx@0.18.x` for users who need the legacy 0.x API.

### 3.5 Dependency Policy (lockstep + exact pin)

- The wrapper's `dependencies` field pins `@vfx-js/react` exactly (`"1.0.0"`).
- Both packages are always published together with the same version number.
- This guarantees the same `@vfx-js/react` instance is resolved in user lockfiles regardless of which package they install.

---

## 4. Release Order

`changesets` publishes in dependency order. Changeset file generation is **out of scope for this spec** and will be performed manually by the maintainer.

Publish order:

1. `@vfx-js/core@1.0.0`
2. `@vfx-js/react@1.0.0` (depends on `@vfx-js/core@1.0.0`)
3. `react-vfx@1.0.0` (exact-pinned to `@vfx-js/react@1.0.0`)

---

## 5. Documentation and Communication

### 5.1 Files to Update

- `packages/react/README.md`: full README for `@vfx-js/react` (based on the previous `react-vfx` README, updated for v1.0).
- `packages/react-vfx/README.md`: short deprecation-notice style document (see 3.4).
- `packages/docs-react/`: previously `docs-react-vfx`. Update internal dependencies and code examples that import `react-vfx` to use `@vfx-js/react`.
- `packages/docs/`: update React-related sections in the root documentation site to refer to `@vfx-js/react`.

### 5.2 Migration Guide

The migration guide lives in `packages/react-vfx/README.md` (with cross-links from `packages/docs/` as appropriate) and includes:

- Explanation of the package rename.
- Install steps (uninstall + install).
- Import rewrite example (`from "react-vfx"` → `from "@vfx-js/react"`).
- Link to the v1.0 breaking API changes (defined in a separate spec).
- Instructions to pin `react-vfx@0.18.x` for users who need the legacy API.

### 5.3 `npm deprecate` Operation (Future Work)

Not executed at release time. When the right moment arrives, run:

```sh
npm deprecate react-vfx@"<2.0.0" \
  "Renamed to @vfx-js/react. See https://github.com/fand/vfx-js#migration"
```

---

## 6. Other In-Repo Updates

Replace `react-vfx` references with `@vfx-js/react` across:

- `packages/docs-react/` (post-rename): all code examples and dependency entries.
- `packages/storybook/`: imports in React-related stories.
- `packages/examples/`: dependency entries and imports in affected examples.
- Root `README.md`: any mentions.
- Workspace config (`pnpm-workspace.yaml`, etc.): the directory glob `packages/*` does not change. However, any consuming `package.json` whose `dependencies` / `devDependencies` reference `react-vfx` by package name must be updated to `@vfx-js/react`.

The newly created `packages/react-vfx/` (wrapper) coexists in the workspace as a separate package.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Duplicate instances when a user has both packages installed (e.g. React Context split) | Exact pin + lockstep publish ensures the lockfile resolves a single `@vfx-js/react` version. |
| `export *` may miss some named exports | TypeScript type checking and existing tests verify completeness. Add explicit `export type *` if needed. |
| Forgetting to publish the wrapper causes version mismatch | Add a release checklist item: "all three packages published". |
| Users install both packages and lose the wrapper benefit | Explicit warning in `react-vfx` README. |

---

## 8. Out of Scope

- The actual `@vfx-js/core` v1.0 API changes.
- The actual `@vfx-js/react` v1.0 API changes (those that follow the core changes).
- Generation of changeset files / version bumping.
- Timing of the `npm deprecate` execution.
- Patch releases for the legacy `react-vfx@0.18.x`.
