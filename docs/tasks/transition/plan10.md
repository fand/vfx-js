# Slides: `show()` on the transition handle

Branch `feat/transition`. Context: [plan9.md](./plan9.md),
[progress.md](./progress.md), [docs/TRANSITION.md](../../TRANSITION.md).

## Why

A transition has a **container** and **slides**. In React the container
is the `<VFXTransition>` div and each page is a slide that declares its
entry with `<TransitionIn>`. Core only has `run(cb)`: "change the
container's content in `cb`". That fits routers, which build the new
content on the fly. It does not fit tabs, carousels or steps, where every
slide is already in the DOM and the job is to pick which one shows.

The Core example in the docs and the demo (`panel.innerHTML =
renderTab(...)`) makes `panel` both container and slide, and calls an
undefined `renderTab`. Replace it with a slide API.

## Model

- Slides are the **direct children** of the container. No marker
  attribute. Put controls outside the container.
- One slide shows at a time. The others carry the `hidden` attribute.
- An element passed to `show()` that is not in the DOM is appended to the
  container first, so generated content works with the same call.
- `run(cb)` stays as the low-level primitive. `show()` is built on it.

## Core API

```ts
interface TransitionHandle {
    show(slide: SlideRef, opts?: ShowOpts): Promise<void>;
    run(cb, opts?): Promise<void>;
    cancel(): void;
    destroy(): void;
    readonly running: boolean;
}

/** A direct child of the container, its index, or a selector inside it. */
type SlideRef = HTMLElement | number | string;

type ShowOpts = RunOpts & {
    /** Remove the slides it hides instead of hiding them. Default false. */
    remove?: boolean;
};
```

`show(slide, opts)`:

1. Resolve `slide`. `number` → `container.children[i]`; `string` →
   `container.querySelector(s)`. Throw a `TypeError` (sync, before any
   run) if it resolves to nothing, or to an element that is attached but
   not a direct child.
2. If the slide is already the only visible child, resolve at once with
   no run.
3. Otherwise `run(cb, opts)` where `cb`:
   - appends the slide if it is detached;
   - for every other direct child: `remove ? child.remove() : child.hidden = true`;
   - `slide.hidden = false`.

Notes:

- `hidden` is chosen over a class because it needs no CSS. Document the
  one trap: a user `display` rule on the slide beats `hidden`; add
  `[hidden] { display: none !important }` or use `remove: true`.
- The snapshot is taken before `cb`, so removing the old slide inside
  `cb` is safe. A stale or cut run still applies `cb`, as `run` does now.
- `reverse`, `transition`, etc. come through `ShowOpts` like a run.
- No per-slide default spec in core for now. The React `<TransitionIn>`
  equivalent for core can come later (e.g. a spec map on the handle);
  it is not needed for the examples.

### Rename `Transition` → `TransitionHandle`

The interface is the per-element controller, not a transition. The name
collides with the React component idea and with other libraries'
`<Transition>`. `addTransition` is unreleased, so rename without an
alias. `TransitionController` (the class) keeps its name.

Touch: `transition/types.ts`, `transition/transition.ts`, `vfx.ts`,
`index.ts`, the React bindings' type imports, docs.

## React

- `VFXTransition` and `useVFXTransition` keep using `run(cb)`: React owns
  the children, so toggling `hidden` from core would fight it. No `show`
  in the React API. Say so in the docs.
- Only the type import rename.

## Storybook

`Transition.stories.ts` builds pages with `container.innerHTML =
renderPage(index)`. Change it to render all pages up front as children
(all but the first `hidden`) and switch with `show(index)`. That is the
visual test for `show`.

## Docs

`docs/TRANSITION.md`:

- Core example → tabs:

  ```ts
  const t = vfx.addTransition(panel, { transition: swipe, duration: 0.6 });
  for (const tab of tabs) {
      tab.addEventListener("click", () => t.show(tab.dataset.panel!));
  }
  ```

  with the HTML: `#panel` holding three `<section>`s, two of them
  `hidden`.
- `Transition` section → `TransitionHandle`, add `show` and `ShowOpts`,
  the direct-children rule, the detached-append rule, the `hidden` trap.
- Keep the `run` section; introduce it as "when the content is built on
  the fly (routers, innerHTML)".
- React section: one line that React uses `run` only.

Demo (`packages/transition-demo/next`):

- `app/page.tsx` Vanilla tab and `getting-started/frameworks.ts` (the
  plain-DOM snippet around line 286): the tabs example above.
- SvelteKit / Nuxt / Astro snippets are router outlets; keep `run`.
- `how-it-works`: the step "Your callback changes the DOM" gets a line
  that `show(slide)` writes that callback for you.
- No change to the demo's own routing code.

## Tests

`transition/transition.test.ts`, with the existing fake host:

- `show(el)` hides the other children and shows `el`; `cb` runs after the
  snapshot.
- Index and selector resolve; missing or non-child targets throw before
  any run starts.
- A detached element is appended, then shown.
- `remove: true` removes the hidden siblings.
- Showing the already visible slide does not start a run.
- `ShowOpts` reach `resolveSpec` (e.g. `reverse`).

## Changeset

Edit `.changeset/core-add-transition.md` (unreleased): the handle is
`TransitionHandle`, and add `show()`. No new changeset.

## Order

1. Core: types, `show`, rename, tests, exports.
2. React: type imports; run its tests.
3. Storybook story.
4. Docs and demo snippets.
5. Changeset, progress.md.
