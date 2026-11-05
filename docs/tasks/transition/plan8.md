# Transition demo polish

Fixes for the Next demo (`packages/transition-demo/next`) after a review
pass. Branch `feat/transition`. Context: [plan7.md](./plan7.md),
[progress.md](./progress.md).

Items:

1. Sidebar on every page but `/`.
2. Plain `<h1>` headers on doc pages.
3. How it works: a before → run → after DOM figure.
4. Transitions page: presets draw outside the stage; datamosh edges
   stretch.
5. Custom page: syntax highlight in the editor.

## 1. Sidebar

Put it **inside the outlet**, not next to it.

```tsx
// shell.tsx
<VFXTransition fullscreen={false} className="outlet" ...>
  <div className="outlet-page">
    <DocSidebar />
    {children}
  </div>
</VFXTransition>
```

- `DocSidebar` is a client component. `usePathname()`; render `null` on
  `/`.
- Why inside: a run locks the box at its old size and the content jumps
  after. A sidebar outside the outlet would change the outlet width on
  `/` ↔ doc page, so the canvas would cover the sidebar during the run
  and jump at the end. Inside, both textures hold the sidebar at the same
  spot and the shader runs over it like the rest of the page.
- `pageKey` remounts the children, so the sidebar remounts per
  navigation. Cheap; nothing to keep.
- Layout: `.outlet-page { display: flex }`, `.doc-sidebar { flex: none;
  width: 232px; overflow-y: auto; border-right: 1px solid var(--line);
  padding: 32px 20px }`, `.frame { flex: 1; min-width: 0 }`. Hide under
  900px (the header nav covers it).
- Content: the four nav items from `site.ts`. Each item gets
  `sections: { id, label }[]`; the current page lists them as `#id`
  links. Add the `id`s to the `<section>`s. Hash links don't change
  `pageKey`, so no run; the browser scrolls the `.frame` scroll
  container to the anchor.
- Header nav stays as is. `/` needs it, and it marks the current page.

## 2. Plain headers

Replace each `.doc-hero` (kicker + serif `<em>` headline) with a plain
title:

```tsx
<section className="doc-title">
  <h1>How It Works</h1>
</section>
```

- Titles: "Getting Started", "How It Works", "Transitions",
  "Custom Transitions".
- Keep the lead paragraph only where it tells the reader what to do:
  Transitions ("Click a preset to play it…") and Custom (the one-line
  definition). Drop the rest, drop every kicker.
- CSS: `.doc-title { padding: 56px 0 8px } h1 { font: 600 40px/1.1
  var(--sans); letter-spacing: -0.03em }`. Remove `.doc-hero` rules once
  unused. `/` keeps `.hero`.

## 3. How it works: the DOM figure

The 4-card `pipeline` (Snapshot / Swap / Capture / Shade) says nothing
about what happens to the DOM. Replace it with one figure of three
pseudo-HTML blocks, before → run → after, and keep the four steps as a
plain `<ol>` under it.

```
before                      run(cb)                         after
<main class="outlet">   →   <canvas layoutsubtree>      →   <main class="outlet">
  <PageA />                   <main class="outlet">           <PageB />
</main>                         <PageB />                   </main>
                              </main>
                            </canvas>
```

- This is the real DOM: `wrapElement` inserts a `<canvas layoutsubtree
  content="drawable">` and moves the element into it, a still copy covers
  the first frame, and the fixed VFX canvas draws the shader output. At
  `t = 1` the element is unwrapped.
- Under "run", a caption: the snapshot of A is `readFrom`, the live
  capture of B is `readTo`, the shader mixes them on the VFX canvas while
  the real DOM is already B.
- Arrow labels: `run(cb)` between before and run, `t = 1` between run and
  after. Under 900px the arrows turn down, like `.pipe` does today.
- Render each block with `highlight()` from `code.tsx` (moved to
  `_components/highlight.ts`), so tags are colored like the code blocks.
- Delete the later `wrap-fig` (rest / run / rest). The new figure covers
  it; keep the "DOM stays DOM" text.

## 4. Transitions page: drawing outside the stage

### What happens

- `Playground` calls `useVFXTransition({ overflow: 48 })`. Precedence is
  run → type → container → def, so every preset gets a 48 px pad, and
  the zoom family's own `overflow: true` is cut to 48 px.
- `glitch` and `glitchSlide` `fract()` the uv, so the pad shows wrapped
  content. `swipe` reads `uv - move * t`, which is in range inside the
  pad along the move. `zoom` guards `to` with `inRange(uv)` but grows
  `from` by design.
- `zoom`, `zoomBlur`, `crosszoom` draw into the pad and stop at its edge.
  That is the hard crop.
- `datamosh`: `DatamoshEffect` sits after the transition stage, so its
  input is the padded buffer. It blits the content into element-sized
  RTs through `uvSrc` (correct), but `FRAG_DISPLAY` samples
  `texture(tex, uvContent)`, and in the pad `uvContent` is outside
  [0, 1]. Clamp-to-edge stretches the edge pixels across the pad.
  `PixelSortEffect` maps `uvContent * srcSize` the same way; check it.

### Fixes

- **Presets stay inside unless they declare `overflow`.** Add
  `if (!inRange(uv)) return vec4(0.0);` first thing in `swipe`,
  `glitch` and `glitchSlide`. `crossfade`, `pixelsort` and `datamosh`
  only call `readFrom(uv)` / `readTo(uv)`, which already return black
  outside. Test: each non-overflow preset's `frag` contains the guard.
- **Effects are transparent outside the content.** `FRAG_DISPLAY` in
  `datamosh.ts` (and the pixelsort display pass, if it has the same
  hole) returns `vec4(0.0)` when `uvContent` is outside [0, 1].
- **Playground drops `overflow: 48`.** Each preset then uses its own
  value: the zoom family gets the whole canvas, the others none. That is
  what a user gets from the preset, which is what the page should show.
  With the whole canvas the old content grows across the viewport for
  the run, over the header too, since the VFX canvas is fixed at
  z-index 9999. Accept it on this page; the outlet keeps `overflow={0}`.
- Docs: one line in `TRANSITION.md` under GLSL: a shader that wraps or
  shifts `uv` should guard with `inRange(uv)`, so a container `overflow`
  doesn't leak content outside the element. Same line in the Custom
  page's prelude table.
- Changesets: `@vfx-js/transitions` patch (presets stay inside the
  element under a container `overflow`), `@vfx-js/effects` patch
  (datamosh display is transparent outside the content rect).

Considered and rejected: let the def's `overflow` cap the container's.
The precedence is documented, and the outlet relies on the container's
`overflow: 0` beating the zoom presets.

## 5. Custom page: editor highlight

Overlay editor, no new dependency.

```tsx
<div className="lab-code">
  <pre aria-hidden ref={preRef}><code>{highlight(frag + "\n")}</code></pre>
  <textarea value={frag} onChange onScroll={sync} onKeyDown={tab} />
</div>
```

- `textarea` on top with `color: transparent; caret-color: #e6e6ef;
  background: transparent`. Both layers share font, padding,
  line-height, `tab-size`, `white-space: pre`, `overflow: auto`. The
  `pre` gets `frag + "\n"` so the last line keeps the same height.
- `onScroll` copies `scrollTop` / `scrollLeft` to the `pre`.
- Tab inserts two spaces.
- `highlight()` moves to `_components/highlight.ts` and learns GLSL:
  keywords `in out uniform precision void int mat2 mat3 mat4 sampler2D
  discard`, builtins `mix smoothstep step fract clamp texture length dot
  sin cos floor abs min max` as `tk-f`, `#version`-style lines as
  comments. `code.tsx` and the DOM figure import it.
- CodeMirror 6 with `legacy-modes` clike was the alternative. Too much
  for one textarea on a demo.

## 6. Verify

- `pnpm --filter @vfx-js/transitions test`, `pnpm run lint`, Next demo
  `build:demo`.
- Browser, playground, each preset at 0.3 s and 3 s: glitch, glitchSlide,
  swipe (all four directions), datamosh, pixelsort draw nothing outside
  the stage; zoom, zoomBlur, crosszoom spread past the stage with no hard
  edge. Put `overflow: 48` back for one check that datamosh edges no
  longer stretch under a pad, then remove it.
- Custom editor: typing, scroll sync on long shaders, Tab, long lines.
- Sidebar: none on `/`, present on doc pages, `/` → `/getting-started`
  shows no width jump, anchors scroll inside the frame, hidden under
  900 px.
- Headers and the DOM figure at 1280 px and 390 px.

## Risks

- `zoomBlur` and `crosszoom` on the whole canvas are 16-tap blurs over
  the viewport. Fine on a laptop at 0.9 s; if the playground stutters,
  cap with `overflow: 240` on those two entries only, not on the hook.
- The overlay editor can drift if the browser wraps the textarea. Keep
  `white-space: pre` and `wrap="off"` on both layers.
