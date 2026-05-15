# `react-vfx` → `@vfx-js/react` Rename — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the React package from `react-vfx` to the scoped `@vfx-js/react`, rename the docs site directory accordingly, and add a thin `react-vfx` wrapper package that re-exports from `@vfx-js/react` for backward compatibility.

**Architecture:** Three commits, each producing a working state:
1. Move `packages/react-vfx/` → `packages/react/` and update every in-repo consumer.
2. Move `packages/docs-react-vfx/` → `packages/docs-react/` and update the deploy workflow.
3. Add a brand new `packages/react-vfx/` minimal wrapper package.

Versions are intentionally **not** bumped here — that is handled separately by the maintainer via `changesets`. Spec: `docs/tasks/merge-react-vfx/spec.md`.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript (dual ESM/CJS), Vitest, Biome, Storybook 10, Vite, Changesets.

---

## File Map

### Created

- `packages/react-vfx/package.json` — wrapper package manifest (new)
- `packages/react-vfx/tsconfig.json`
- `packages/react-vfx/tsconfig.esm.json`
- `packages/react-vfx/src/index.ts`
- `packages/react-vfx/src/index.test.ts`
- `packages/react-vfx/README.md`
- `packages/react-vfx/.gitignore`

### Renamed (`git mv`, history preserved)

- `packages/react-vfx/` → `packages/react/`
- `packages/react-vfx/src/react-vfx.ts` → `packages/react/src/react.ts` (file inside the moved dir)
- `packages/docs-react-vfx/` → `packages/docs-react/`

### Modified

- `packages/react/package.json` (post-move): `name`, nothing else
- `packages/react/src/index.ts`: re-export path updated for the file rename
- `packages/docs-react/package.json` (post-move): `name`, dependency `react-vfx` → `@vfx-js/react`
- `packages/docs-react/vite.config.ts`: alias key + path
- `packages/docs-react/src/App.tsx`, `src/dom/*.tsx` (8 files): `import` source
- `packages/docs-react/src/dom/UsageSection.tsx`: in-page code examples and link
- `packages/storybook/package.json`: dependency `react-vfx` → `@vfx-js/react`
- `packages/storybook/.storybook/main.ts`: alias key + path
- `packages/storybook/src/*.ts` and `src/*.tsx` (5 story files): `import` source + one display label
- `.github/workflows/deploy-react-vfx.yml`: `source-directory` path

---

## Commit 1: Rename `packages/react-vfx/` → `packages/react/`

**Files:**
- Rename: `packages/react-vfx/` → `packages/react/`
- Rename: `packages/react/src/react-vfx.ts` → `packages/react/src/react.ts`
- Modify: `packages/react/package.json` (name field only)
- Modify: `packages/react/src/index.ts` (re-export path)
- Modify: `packages/storybook/package.json` (dep name)
- Modify: `packages/storybook/.storybook/main.ts` (alias)
- Modify: `packages/storybook/src/HtmlInCanvas.stories.ts` (import + label)
- Modify: `packages/storybook/src/ContextLost.stories.ts` (import)
- Modify: `packages/storybook/src/EffectReact.stories.tsx` (import)
- Modify: `packages/storybook/src/EffectReactCanvas.stories.tsx` (import)
- Modify: `packages/storybook/src/EffectReactElements.stories.tsx` (import)
- Modify: `packages/docs-react-vfx/package.json` (dep name; this dir will be renamed in Commit 2)
- Modify: `packages/docs-react-vfx/vite.config.ts` (alias key + path)
- Modify: `packages/docs-react-vfx/src/App.tsx` (import)
- Modify: `packages/docs-react-vfx/src/dom/AuthorSection.tsx` (import)
- Modify: `packages/docs-react-vfx/src/dom/DivSection.tsx` (import)
- Modify: `packages/docs-react-vfx/src/dom/ExamplesSection.tsx` (import)
- Modify: `packages/docs-react-vfx/src/dom/InputSection.tsx` (import + in-page code example)
- Modify: `packages/docs-react-vfx/src/dom/IntroSection.tsx` (import)
- Modify: `packages/docs-react-vfx/src/dom/LogoSection.tsx` (import)
- Modify: `packages/docs-react-vfx/src/dom/UsageSection.tsx` (import + in-page code examples + GitHub link)

### Steps

- [ ] **Step 1: Verify a clean working tree before starting.**

```bash
git status --short
```

Expected: only the optional `?? .playwright-mcp/` (or empty). If there are other staged/modified files, stop and ask.

- [ ] **Step 2: Move the package directory.**

```bash
git mv packages/react-vfx packages/react
```

Expected: no output. `git status` should show many `R` (rename) entries under `packages/react/`.

- [ ] **Step 3: Move the internal `react-vfx.ts` file.**

```bash
git mv packages/react/src/react-vfx.ts packages/react/src/react.ts
```

- [ ] **Step 4: Update the package name in `packages/react/package.json`.**

Change line 2 from:

```json
  "name": "react-vfx",
```

to:

```json
  "name": "@vfx-js/react",
```

Leave every other field unchanged. **Do NOT bump the version. Do NOT touch `dependencies`.** (Version bumping and the `@vfx-js/core` dep bump to 1.0.0 are handled later by the maintainer via changesets.)

- [ ] **Step 5: Update the re-export path in `packages/react/src/index.ts`.**

Replace the entire file contents with:

```ts
export * from "./react.js";
```

- [ ] **Step 6: Update `packages/storybook/package.json` dependency.**

In the `dependencies` block, change:

```json
    "react-vfx": "0.18.0"
```

to:

```json
    "@vfx-js/react": "0.18.0"
```

(The version stays `0.18.0` — pnpm will resolve it locally because `linkWorkspacePackages: true` and the local `@vfx-js/react` is at `0.18.0` after the rename.)

- [ ] **Step 7: Update the storybook alias in `packages/storybook/.storybook/main.ts`.**

Find line 32 (inside the Vite config alias block):

```ts
                "react-vfx": join(__dirname, "../../react-vfx/src/react-vfx.ts"),
```

Replace with:

```ts
                "@vfx-js/react": join(__dirname, "../../react/src/react.ts"),
```

- [ ] **Step 8: Update storybook story imports.**

Apply this exact substitution to each file: change `from "react-vfx"` → `from "@vfx-js/react"`.

Files (one occurrence each):
- `packages/storybook/src/HtmlInCanvas.stories.ts` (line 4)
- `packages/storybook/src/ContextLost.stories.ts` (line 4)
- `packages/storybook/src/EffectReact.stories.tsx` (line 5)
- `packages/storybook/src/EffectReactCanvas.stories.tsx` (line 5)
- `packages/storybook/src/EffectReactElements.stories.tsx` (line 3)

- [ ] **Step 9: Update the storybook display label.**

In `packages/storybook/src/HtmlInCanvas.stories.ts` line 268, change:

```ts
                    h("h2", null, "VFXCanvas (react-vfx)"),
```

to:

```ts
                    h("h2", null, "VFXCanvas (@vfx-js/react)"),
```

- [ ] **Step 10: Update `packages/docs-react-vfx/package.json` dependency.**

In `dependencies`, change:

```json
    "react-vfx": "0.18.0",
```

to:

```json
    "@vfx-js/react": "0.18.0",
```

(This file will be moved to `packages/docs-react/` in Commit 2 — leaving the in-place edit here keeps the diff smaller and ordering simpler.)

- [ ] **Step 11: Update the Vite alias in `packages/docs-react-vfx/vite.config.ts`.**

Find line 16:

```ts
            "react-vfx": resolve(__dirname, "../react-vfx/src/index.ts"),
```

Replace with:

```ts
            "@vfx-js/react": resolve(__dirname, "../react/src/index.ts"),
```

- [ ] **Step 12: Update docs-react-vfx source imports.**

Apply this exact substitution to each file: change `from "react-vfx"` → `from "@vfx-js/react"`.

Files (one occurrence each):
- `packages/docs-react-vfx/src/App.tsx` (line 2)
- `packages/docs-react-vfx/src/dom/AuthorSection.tsx` (line 2)
- `packages/docs-react-vfx/src/dom/DivSection.tsx` (line 2)
- `packages/docs-react-vfx/src/dom/ExamplesSection.tsx` (line 3)
- `packages/docs-react-vfx/src/dom/IntroSection.tsx` (line 2)
- `packages/docs-react-vfx/src/dom/LogoSection.tsx` (line 2)
- `packages/docs-react-vfx/src/dom/InputSection.tsx` (line 2)
- `packages/docs-react-vfx/src/dom/UsageSection.tsx` (line 2)

- [ ] **Step 13: Update in-page code example in `InputSection.tsx`.**

In `packages/docs-react-vfx/src/dom/InputSection.tsx` around line 20, change the embedded code-example string:

```tsx
                import { VFXSpan } from 'react-vfx';
```

to:

```tsx
                import { VFXSpan } from '@vfx-js/react';
```

- [ ] **Step 14: Update in-page content in `UsageSection.tsx`.**

In `packages/docs-react-vfx/src/dom/UsageSection.tsx`, apply the following changes:

(a) Line 67 — install command:

```tsx
            <code>npm i react-vfx</code>
```

→

```tsx
            <code>npm i @vfx-js/react</code>
```

(b) Lines 71-72 — GitHub link:

```tsx
                    href="https://github.com/fand/vfx-js/tree/main/packages/react-vfx"
```

→

```tsx
                    href="https://github.com/fand/vfx-js/tree/main/packages/react"
```

(c) All embedded code-example strings showing `from 'react-vfx'`. Change every `from 'react-vfx'` (single quotes, inside JSX text) to `from '@vfx-js/react'`. Affected lines: 100, 134, 153, 173, 186, 226, 288.

Verify with:

```bash
grep -n "react-vfx" packages/docs-react-vfx/src/dom/UsageSection.tsx
```

Expected: no matches after the edits.

- [ ] **Step 15: Refresh the lockfile.**

```bash
pnpm install
```

Expected: no errors. Lockfile updates: removal of `react-vfx` external entries, addition/relink of `@vfx-js/react` workspace package.

- [ ] **Step 16: Run lint, build, and tests across the workspace.**

```bash
pnpm run lint
```

Expected: passes. (If Biome flags any of the modified files, fix and re-run.)

```bash
pnpm run build
```

Expected: all packages build successfully. Watch especially for `@vfx-js/react`, `@vfx-js/storybook`, and `docs-react-vfx`.

```bash
pnpm test
```

Expected: `@vfx-js/core` tests pass. (No tests exist yet for `@vfx-js/react` itself; existing `lifecycle.test.ts` is in `packages/react/src/` and runs via the package's own `test` script.)

```bash
pnpm --filter @vfx-js/react run test
```

Expected: pass.

- [ ] **Step 17: Sanity grep — confirm no stray `react-vfx` references remain (excluding the dirs/files we plan to keep).**

```bash
grep -rn "react-vfx" --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.json" --include="*.yaml" --include="*.yml" --include="*.html" \
  --include="*.md" --include="*.mdx" -- . 2>/dev/null \
  | grep -v node_modules | grep -v "\.turbo/" | grep -v "lib/" \
  | grep -v "build/" | grep -v "dist/" | grep -v "pnpm-lock.yaml" \
  | grep -v "CHANGELOG.md" | grep -v "docs/tasks/merge-react-vfx/"
```

Expected remaining hits (these are intentionally NOT changed in this commit):
- `packages/docs-react-vfx/...` — directory will be renamed in Commit 2
- `packages/docs-react-vfx/public/index.html` and `index.html` — `og:url` and `twitter:url` containing `amagi.dev/react-vfx/` (external hosted-site URLs; out of scope)
- `packages/react/README.md` — has the legacy README content; will be addressed in Commit 3 alongside the wrapper README
- `.github/workflows/deploy-react-vfx.yml` — workflow file path/name; updated in Commit 2
- Root `README.md`, `AGENTS.md`, `CLAUDE.md` — review separately in Commit 3
- `packages/vfx-js/README.md`, `packages/vfx-js/typedoc.json`, `packages/vfx-js/src/vfx.ts` — these likely reference the package only in prose/comments; verify in Commit 3

If any *unexpected* hit remains, fix it before committing.

- [ ] **Step 18: Commit.**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: rename react-vfx package to @vfx-js/react

Move packages/react-vfx/ to packages/react/ and rename the package to
@vfx-js/react. Update all in-repo consumers (storybook, docs-react-vfx)
to import from the new package name. Versions are unchanged.

Spec: docs/tasks/merge-react-vfx/spec.md
EOF
)"
```

Expected: commit succeeds. `git status` clean (apart from `?? .playwright-mcp/`).

---

## Commit 2: Rename `packages/docs-react-vfx/` → `packages/docs-react/`

**Files:**
- Rename: `packages/docs-react-vfx/` → `packages/docs-react/`
- Modify: `packages/docs-react/package.json` (name only)
- Modify: `.github/workflows/deploy-react-vfx.yml` (`source-directory` path)

### Steps

- [ ] **Step 1: Move the docs directory.**

```bash
git mv packages/docs-react-vfx packages/docs-react
```

- [ ] **Step 2: Update the package name.**

In `packages/docs-react/package.json` line 2, change:

```json
  "name": "docs-react-vfx",
```

to:

```json
  "name": "docs-react",
```

(Version, dependencies, and the rest of the file are unchanged.)

- [ ] **Step 3: Update the deploy workflow's source path.**

In `.github/workflows/deploy-react-vfx.yml`, change:

```yaml
                  source-directory: "packages/docs-react-vfx/dist"
```

to:

```yaml
                  source-directory: "packages/docs-react/dist"
```

Leave everything else (workflow filename, `name:` field, deploy target repo/URL) alone — those are separate concerns the maintainer can revisit later.

- [ ] **Step 4: Refresh the lockfile.**

```bash
pnpm install
```

Expected: no errors. The workspace package name change updates `pnpm-lock.yaml`'s importers entry.

- [ ] **Step 5: Build the docs site to confirm.**

```bash
pnpm --filter docs-react run build
```

Expected: build succeeds; output in `packages/docs-react/dist/`.

- [ ] **Step 6: Full lint + build + test sanity check.**

```bash
pnpm run lint && pnpm run build && pnpm test
```

Expected: all pass.

- [ ] **Step 7: Commit.**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: rename docs-react-vfx package to docs-react

Move packages/docs-react-vfx/ to packages/docs-react/ via git mv to
preserve history. Update the deploy workflow's source-directory to
match the new path.

Spec: docs/tasks/merge-react-vfx/spec.md
EOF
)"
```

---

## Commit 3: Add the `react-vfx` wrapper package

**Files:**
- Create: `packages/react-vfx/package.json`
- Create: `packages/react-vfx/tsconfig.json`
- Create: `packages/react-vfx/tsconfig.esm.json`
- Create: `packages/react-vfx/src/index.ts`
- Create: `packages/react-vfx/src/index.test.ts`
- Create: `packages/react-vfx/README.md`
- Create: `packages/react-vfx/.gitignore`
- Modify: any remaining root-level docs (root `README.md`, `AGENTS.md`, `CLAUDE.md`, `packages/vfx-js/README.md`, `packages/react/README.md`) that reference `react-vfx` in prose, only where the meaning has changed (see Step 9 below)

### Steps

- [ ] **Step 1: Create the wrapper directory and `package.json`.**

```bash
mkdir -p packages/react-vfx/src
```

Create `packages/react-vfx/package.json` with this exact content:

```json
{
  "name": "react-vfx",
  "description": "Renamed to @vfx-js/react. This package re-exports @vfx-js/react for backward compatibility.",
  "version": "0.18.0",
  "files": [
    "package.json",
    "README.md",
    "lib/"
  ],
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
  "scripts": {
    "build": "run-s clean build:cjs build:esm build:dual",
    "build:cjs": "tsc -d",
    "build:esm": "tsc -d -p tsconfig.esm.json",
    "build:dual": "tsconfig-to-dual-package",
    "clean": "rimraf lib",
    "dev": "run-p watch:cjs watch:esm",
    "watch:cjs": "tsc -d -w",
    "watch:esm": "tsc -d -w -p tsconfig.esm.json",
    "lint": "biome check .",
    "format": "biome check --write .",
    "lint-staged": "lint-staged",
    "test": "vitest --dir src --run",
    "test:watch": "vitest --dir src"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@vfx-js/react": "0.18.0"
  },
  "devDependencies": {
    "@biomejs/biome": "2.4.11",
    "@types/node": "24.12.2",
    "@types/react": "^19.1.6",
    "lint-staged": "^16.1.0",
    "npm-run-all2": "^8.0.4",
    "rimraf": "^6.0.1",
    "tsconfig-to-dual-package": "^1.2.0",
    "typescript": "6.0.2",
    "vitest": "4.1.4"
  },
  "lint-staged": {
    "src/*.{ts,tsx}": [
      "biome check --no-errors-on-unmatched --files-ignore-unknown=true"
    ]
  },
  "author": "Takayosi Amagi <fand.gmork@gmail.com> (https://amagi.dev/)",
  "homepage": "https://amagi.dev/vfx-js",
  "repository": {
    "url": "https://github.com/fand/vfx-js"
  },
  "bugs": {
    "url": "https://github.com/fand/vfx-js/issues"
  },
  "keywords": [
    "glsl",
    "react",
    "threejs",
    "webgl"
  ],
  "license": "MIT"
}
```

Note: `version` is set to `0.18.0` to match the current `@vfx-js/react` (post-rename) version. This keeps pnpm workspace resolution working out of the box. The maintainer will use changesets to bump both packages in lockstep when the v1.0 release is cut.

- [ ] **Step 2: Create `tsconfig.json` (CJS build).**

Create `packages/react-vfx/tsconfig.json` with the same content as `packages/react/tsconfig.json`:

```json
{
    "compilerOptions": {
        "target": "es2020",
        "module": "CommonJS",
        "lib": ["es2020", "dom"],
        "sourceMap": true,
        "outDir": "lib/cjs",
        "rootDir": "src",
        "ignoreDeprecations": "6.0",
        "removeComments": false,
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "moduleResolution": "node",
        "jsx": "react-jsx",
        "skipLibCheck": true,
        "esModuleInterop": true,
        "allowJs": true
    },
    "include": ["src"]
}
```

- [ ] **Step 3: Create `tsconfig.esm.json` (ESM build).**

Create `packages/react-vfx/tsconfig.esm.json`:

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "module": "ESNext",
        "outDir": "lib/esm"
    }
}
```

- [ ] **Step 4: Create the wrapper entry point.**

Create `packages/react-vfx/src/index.ts`:

```ts
export * from "@vfx-js/react";
```

- [ ] **Step 5: Write a failing test for the re-export.**

Create `packages/react-vfx/src/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as ReactVfx from "./index.js";
import * as VfxReact from "@vfx-js/react";

describe("react-vfx wrapper", () => {
    it("re-exports every named export of @vfx-js/react", () => {
        const wrapperKeys = Object.keys(ReactVfx).sort();
        const sourceKeys = Object.keys(VfxReact).sort();
        expect(wrapperKeys).toEqual(sourceKeys);
        expect(wrapperKeys.length).toBeGreaterThan(0);
    });

    it("re-exports the same instances (no duplication)", () => {
        for (const key of Object.keys(VfxReact) as (keyof typeof VfxReact)[]) {
            expect((ReactVfx as Record<string, unknown>)[key]).toBe(
                VfxReact[key],
            );
        }
    });
});
```

- [ ] **Step 6: Run the test to verify it fails (because the package isn't installed yet).**

```bash
pnpm --filter react-vfx run test
```

Expected: FAIL — the package isn't yet known to pnpm.

- [ ] **Step 7: Create `.gitignore` for the build output.**

If `packages/react/.gitignore` exists, mirror its content. Otherwise create `packages/react-vfx/.gitignore` with:

```
lib/
node_modules/
```

- [ ] **Step 8: Create the wrapper README.**

Create `packages/react-vfx/README.md`:

````markdown
# react-vfx

> ⚠️ **This package has been renamed to [`@vfx-js/react`](https://www.npmjs.com/package/@vfx-js/react).**
>
> This `react-vfx` package now re-exports `@vfx-js/react` for backward compatibility. New projects should depend on `@vfx-js/react` directly.

## Migrating

```sh
npm uninstall react-vfx
npm install @vfx-js/react
```

Then update your imports:

```diff
- import { VFXProvider, VFXImg } from "react-vfx";
+ import { VFXProvider, VFXImg } from "@vfx-js/react";
```

The two packages export exactly the same API. Switching is a pure rename.

## Staying on the legacy 0.x API

If you need the pre-1.0 API, pin `react-vfx@0.18.x`:

```json
{
  "dependencies": {
    "react-vfx": "0.18.x"
  }
}
```

## Documentation

See the main project: <https://github.com/fand/vfx-js>
````

- [ ] **Step 9: Update root-level docs that mention `react-vfx` in prose.**

Run:

```bash
grep -n "react-vfx" README.md AGENTS.md CLAUDE.md packages/vfx-js/README.md packages/react/README.md packages/vfx-js/typedoc.json packages/vfx-js/src/vfx.ts 2>/dev/null
```

For each hit, decide:
- **Reference is to the npm package name and the recommended package is now `@vfx-js/react`** → update to `@vfx-js/react`.
- **Reference is historical (CHANGELOG-like content, package backward-compat note)** → leave as-is.
- **Reference is to the GitHub directory `packages/react-vfx`** → update to `packages/react`.
- **`packages/react/README.md`** still has the old `react-vfx` README content. Either: (a) rewrite it as the `@vfx-js/react` README using the existing copy as a base (replace the package name in install/import examples), or (b) leave it for a follow-up. Choose (a).

Apply edits inline. Re-run the grep to confirm no stale references remain (excluding the wrapper's own README and the historical CHANGELOGs).

- [ ] **Step 10: Refresh the lockfile.**

```bash
pnpm install
```

Expected: success. The new `react-vfx` workspace package is registered; its `@vfx-js/react@0.18.0` dependency resolves to the local workspace package.

- [ ] **Step 11: Build the wrapper.**

```bash
pnpm --filter react-vfx run build
```

Expected: success. `packages/react-vfx/lib/cjs/index.js`, `packages/react-vfx/lib/esm/index.js`, and corresponding `.d.ts` files are produced.

- [ ] **Step 12: Run the wrapper tests.**

```bash
pnpm --filter react-vfx run test
```

Expected: PASS — both tests succeed.

- [ ] **Step 13: Run lint on the wrapper.**

```bash
pnpm --filter react-vfx run lint
```

Expected: PASS.

- [ ] **Step 14: Full workspace verification.**

```bash
pnpm run lint && pnpm run build && pnpm test
```

Expected: all green.

- [ ] **Step 15: Final sanity grep.**

```bash
grep -rn "react-vfx" --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.json" --include="*.yaml" --include="*.yml" --include="*.html" \
  --include="*.md" --include="*.mdx" -- . 2>/dev/null \
  | grep -v node_modules | grep -v "\.turbo/" | grep -v "lib/" \
  | grep -v "build/" | grep -v "dist/" | grep -v "pnpm-lock.yaml" \
  | grep -v "CHANGELOG.md" | grep -v "docs/tasks/merge-react-vfx/"
```

Expected remaining hits (all intentional):
- `packages/react-vfx/package.json` — the new wrapper package (`"name": "react-vfx"`).
- `packages/react-vfx/README.md` — explains the rename to users.
- `.github/workflows/deploy-react-vfx.yml` — workflow filename and `name:` field; renaming the file is out of scope (would orphan the historical workflow run history).
- Anything in `packages/docs-react/public/index.html` / `index.html` — external hosted-site URLs (`amagi.dev/react-vfx/`); out of scope.

- [ ] **Step 16: Commit.**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add react-vfx wrapper package re-exporting @vfx-js/react

Add packages/react-vfx/ as a thin wrapper that re-exports @vfx-js/react
to give existing react-vfx users a forward-compatible upgrade path.
The wrapper pins @vfx-js/react exactly and is intended to be published
in lockstep. Includes a test verifying export parity.

Spec: docs/tasks/merge-react-vfx/spec.md
EOF
)"
```

- [ ] **Step 17: Final verification before handing off.**

```bash
git status --short
git log --oneline -5
```

Expected: working tree clean (apart from `?? .playwright-mcp/`); the three new commits visible.

---

## What this plan does NOT do

The following are deliberately out of scope and will be performed separately by the maintainer:

- Generating changeset entries (`.changeset/*.md`).
- Bumping versions to `1.0.0`.
- Bumping `@vfx-js/core` to `1.0.0` and updating `@vfx-js/react`'s dependency on it.
- Running `npm deprecate react-vfx@"<2.0.0" "..."`.
- Renaming the `.github/workflows/deploy-react-vfx.yml` file or updating the deploy target URL.
- Updating any external `amagi.dev/react-vfx/` URLs (these belong to the deployed site, not the package).
