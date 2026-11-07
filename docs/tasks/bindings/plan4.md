# Router subpaths: `@vfx-js/vue/router`, `@vfx-js/react/react-router`

On PR #226. HIC (`VFXCanvas`) is a separate PR.

## Goal

```vue
<!-- Vue + vue-router, no Nuxt -->
<script setup lang="ts">
import { VFXTransition } from "@vfx-js/vue/router";
</script>

<template>
    <VFXTransition :transition="Crossfade">
        <RouterView />
    </VFXTransition>
</template>
```

```tsx
// React Router
import { VFXTransition } from "@vfx-js/react/react-router";

<VFXTransition transition={Crossfade} />
```

Pages and links stay as they are: `useTransitionIn` / `<TransitionIn>`,
`transition(spec)`, `setNextTransition(spec)`.

## `@vfx-js/vue/router`

Same as `/nuxt`, except how it knows the new page is in.

- Router: `app.config.globalProperties.$router`, as `/nuxt` reads it.
  No `vue-router` import. Warn once if it is missing.
- When the new page is in: `afterEach` (no failure), then `nextTick`.
  vue-router loads lazy route components before it confirms the
  navigation, so `<RouterView>` renders the new page in that tick.
- Not covered: a page with async `setup` under the user's own
  `<Suspense>`. It may be captured before it resolves. Say so in the
  README; `waitFor` on `<VFXTransition>` is the way out.
- Move the shared glue out of `nuxt/index.ts` into one function, e.g.
  `connectRouter(ctx, router, onPageReady)`: hold in `beforeEach`, back
  from `history.state.position`, free on a dropped or failed navigation,
  `scope.pick(back)` for the spec. `/nuxt` passes `page:finish`,
  `/router` passes `afterEach` + `nextTick`. No change in `/nuxt`
  behavior; its tests must pass unchanged.
- `package.json` export `./router`, like `./nuxt`.

Tests (`router.test.ts`, like `nuxt.test.ts`, fake router):

- `beforeEach` waits until `run` calls `cb`.
- The run ends after `afterEach` + `nextTick`, with the new page in the
  DOM; spec order link → page → `{}`; back adds `reverse`.
- A second navigation frees the first; a failed one (`afterEach` with a
  failure) frees it; the same path does not run.
- Without `$router`: warns, no crash.

## `@vfx-js/react/react-router`

```tsx
export function VFXTransition(props: Omit<VFXTransitionProps, "children" | "pageKey"> & { pageKey?: string | number }) {
    const { pathname } = useLocation();
    const outlet = useOutlet();
    return <BaseVFXTransition {...props} pageKey={props.pageKey ?? pathname}>{outlet}</BaseVFXTransition>;
}
```

- `useOutlet()` returns the outlet with its route context fixed, so the
  kept old page keeps its own route. `<Outlet />` would read the new
  route (see open-issues.md).
- New subpath `src/react-router/index.tsx`, export `./react-router` in
  `package.json`, like `./next`.
- Peer `react-router ^7` (optional). Add it as a devDep (a version at
  least 7 days old; see `minimumReleaseAge`).

Tests (`react-router.test.tsx`, like `VFXTransition.test.tsx`, with
`createMemoryRouter` + `RouterProvider`):

- Navigating starts a run; the old page stays rendered with its own
  content until the swap, then the new page shows.
- `pageKey` defaults to the pathname; a search-only change does not run.

## Storybook

- "Transition/Vue": use a real `vue-router` with `createMemoryHistory`
  and `@vfx-js/vue/router`. Drop the fake router for this story.
- New "Transition/React Router": `createMemoryRouter` + `RouterProvider`
  and `@vfx-js/react/react-router`, Next button, 3 pages.
- Aliases in `.storybook/main.ts` for both new subpaths.

## Docs

- `packages/vue/README.md`: a "Vue Router" section next to Nuxt.
- `packages/react/README.md`: a React Router section.
- `docs/TRANSITION.md`: mention both subpaths.
- Getting Started: React tab uses `@vfx-js/react/react-router`; new
  "Vue" tab with `@vfx-js/vue/router`.
- Changeset: minor for `@vfx-js/react`. `@vfx-js/vue` already has one;
  extend its text.
- `progress.md`: a section for this work.

## Checks

- `pnpm run lint`, `pnpm test`, `pnpm run build` in packages/vue and
  packages/react.
- `build-storybook`; check both transition stories in a browser.
