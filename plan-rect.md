# Replace `outputSize` (pad-delta) with `outputRect` (element-local rect)

## Context

The current `Effect.outputSize()` API has accumulated several distinct return shapes (`{ pad: number }`, `{ pad: {top,right,bottom,left} }`, `{ size: [w,h] }`, `[w, h]`) that all converge on the same internal data — per-side pad accumulated across the chain. Two structural problems:

1. **`pad` is a delta, not absolute**: `{ pad: 10 }` means "add 10px to src pad on each side". Across multi-stage chains this accumulates (`[a({pad:10}), b({pad:10})]` → final pad = 20). The semantic mismatch with the method name `outputSize` ("return your size", not "return your delta") is a recurring source of confusion.
2. **Per-side info is canonical**: `rectContent.xy` depends on `pad.left`/`pad.bottom` directly, not just total size. The `size` form has to recover per-side via a `distributePad()` heuristic, breaking asymmetric pad use cases.

A cleaner abstraction: **each stage declares its own rect in element-local coordinates**. Each stage independent; no accumulation; no monotonic clamp; no heuristic recovery.

```
contentRect = [0, 0, elemW, elemH]               // element occupies origin
outset 10px = [-10, -10, elemW + 20, elemH + 20] // valid; rect extends past element on all sides
fullscreen  = dims.canvasRect                    // canvas in element-local coords
```

The chain converts rect → uniforms via the same affine map as today, so downstream (`uvSrc`/`uvContent`/`rectSrc`/`rectContent`) is unchanged.

## Recommended approach

Replace `outputSize` with `outputRect`. Drop pad accumulation, monotonic clamp, and `distributePad` heuristic. Internal chain state simplifies from `(srcPad, srcBufferSize, dstPad, dstBufferSize)` per stage to `dstRect` only.

### Public API

```typescript
/**
 * Rect in element-local physical px, **bottom-left origin** (matches GL UV
 * convention and the chain's `elementRectOnCanvasPx`).
 *   x: 0 = element's left edge
 *   y: 0 = element's bottom edge (negative y = below element)
 *   w/h: extent
 */
type ElementRect = readonly [x: number, y: number, w: number, h: number];

interface Effect {
    outputRect?(dims: {
        readonly element: readonly [number, number];      // logical px (CSS)
        readonly elementPixel: readonly [number, number]; // physical px
        readonly canvas: readonly [number, number];       // logical px (CSS)
        readonly canvasPixel: readonly [number, number]; // physical px
        readonly pixelRatio: number;
        /** Element rect in element-local px: `[0, 0, elementPixel[0], elementPixel[1]]`. */
        readonly contentRect: ElementRect;
        /** Src buffer's rect in element-local px (= prev stage's `outputRect`, or `contentRect` at stage 0). */
        readonly srcRect: ElementRect;
        /** Canvas rect in element-local px (= `[-elementOffsetX, -elementOffsetY, canvasPhys[0], canvasPhys[1]]`). */
        readonly canvasRect: ElementRect;
    }): ElementRect | undefined;
}
```

Conventions:
- **Bottom-left origin** (matches `elementRectOnCanvasPx`, GL UV, and the existing `mouse` convention in vfx-js).
- **Element-local**: element bottom-left = (0, 0); element top-right = (`elementPixel[0]`, `elementPixel[1]`).
- **Default (undefined / omitted)**: `dstRect = srcRect` (no growth).

### bloom.ts (only consumer)

```typescript
outputRect(dims) {
    if (this.params.pad === "fullscreen") return dims.canvasRect;
    const px = this.params.pad * dims.pixelRatio;
    const [, , ew, eh] = dims.contentRect;
    return [-px, -px, ew + 2 * px, eh + 2 * px];
}
```

### Internal chain logic

`StageLayout`:
```typescript
type StageLayout = {
    /** Stage's rect in element-local physical px (bottom-left). */
    dstRect: ElementRect;
    /** dst buffer size (= rect.w, rect.h). Cached for FBO sizing. */
    dstBufferSize: [number, number];
    /** Content rect within dst buffer UV — derived from `dstRect`. */
    rectContent: [number, number, number, number];
    outputViewport: { x: number; y: number; w: number; h: number };
};
```

`#resolveStages` simplifies:
```typescript
const contentRect: ElementRect = [0, 0, elementPixel[0], elementPixel[1]];
const canvasRect = this.#canvasRectInElementLocal(input);
let srcRect: ElementRect = contentRect;
for (let k = 0; k < M; k++) {
    const dstRect = this.#callOutputRect(effect, dims) ?? srcRect;
    const dstBufferSize: [number, number] = [dstRect[2], dstRect[3]];
    const rectContent = rectInRect(contentRect, dstRect);
    // ...store, allocate intermediate, update outputViewport...
    srcRect = dstRect;
}
```

New helpers:
- `rectInRect(inner: ElementRect, outer: ElementRect): [number, number, number, number]` — inner's UV position within outer = `[(inner.x - outer.x)/outer.w, (inner.y - outer.y)/outer.h, inner.w/outer.w, inner.h/outer.h]`. Bottom-left UV (matches GL).

> **TODO (future)**: validate that `dstRect` contains `contentRect` and warn + clamp otherwise. If a stage returns a rect smaller than the element, the element gets clipped. Out of scope for this plan — `dstRect` is used as-is.

`#hostFrameDims`:
- `rectContent` from current stage's `dstRect`
- `rectSrc` from prev stage's `dstRect` (or `[0, 0, 1, 1]` UV at stage 0)

### Removed

- `outputSize` method (replaced by `outputRect`)
- `{ pad: ... }`, `{ size: ... }`, `[w, h]` return forms
- `dims.fullscreenPad` (use `canvasRect` directly)
- Monotonic clamp + `#warnedMonotonic` set
- `distributePad()` helper
- `#warnedClampBuffer` set

### Hit-test pad

`EffectChain.hitTestPadPhys` returns `Margin` for `vfx-player`'s visibility hit-test rect grow. Convert from `dstRect` of the last stage (bottom-left → Margin):
```typescript
const [x, y, w, h] = stages[M-1].dstRect;
return {
    bottom: Math.max(0, -y),                              // rect extends below element bottom
    top:    Math.max(0, (y + h) - elementPixel[1]),       // rect extends above element top
    left:   Math.max(0, -x),
    right:  Math.max(0, (x + w) - elementPixel[0]),
};
```

## Files to modify

- `packages/vfx-js/src/rect.ts`
  - Add `ElementRect` type and `rectInRect` helper (chain-scoped utility; export as `@internal`).
- `packages/vfx-js/src/types.ts`
  - Replace `outputSize?(...)` signature with `outputRect?(...)` per spec above.
  - Update JSDoc with rect convention + bloom example.
- `packages/vfx-js/src/effect-chain.ts`
  - Rewrite `StageLayout`, `#resolveStages`, `#callOutputSize` (→ `#callOutputRect`), `#fullscreenPadFor` (→ `#canvasRectInElementLocal`), `#hostFrameDims`, `hitTestPadPhys`.
  - Drop `distributePad`, `rectForPad` (replaced by `rectInRect`), `#warnedMonotonic`, `#warnedClampBuffer`.
  - Update doc comments (top of file) describing the rect model.
- `packages/vfx-js/src/effect-chain.test.ts`
  - Delete all `outputSize`-related tests (clean slate).
  - Write new tests first (TDD): stage independence (no monotonic clamp), asymmetric rects, default-undefined inherits srcRect, fullscreen via `canvasRect`.
- `packages/storybook/src/effects/bloom.ts`
  - `outputSize(dims): ...` → `outputRect(dims): ElementRect`. Use `dims.canvasRect` for fullscreen.
- `plan.md`
  - Replace pad-model description with rect-model. Update `outputSize` references → `outputRect`.

## Verification

1. **TDD-first**: delete all `outputSize`-related tests, then write new `outputRect` tests up front — stage independence (no monotonic clamp), asymmetric rects, default-undefined inherits `srcRect`, fullscreen via `canvasRect`. Implement against those tests.
2. **Type check + tests**: `npm --workspace=@vfx-js/core run test`.
3. **Lint**: `npm run lint`.
4. **Manual smoke**: storybook stories — `bloom`, `crtBloom` (chain `[pixelate, scanline, bloom]`), other effect stories — should render identically to before. `pad: 'fullscreen'` should still cover scrollPadding.
5. **Single commit** unless type-flow forces a staged migration.

## Reused utilities

- `Margin` type in `rect.ts` — kept for `hitTestPadPhys` return type; chain-internal pad tracking removed.
- `createMargin` — only used at the hit-test boundary now.

## Notes

- **Bottom-left origin** chosen for chain/shader consistency: matches `elementRectOnCanvasPx`, `mouse`, and GL UV. Effect authors writing GLSL think in bottom-left UV; the rect API matches that mental model.
- **Tuple `[x, y, w, h]`** chosen over object `{x, y, w, h}` for concision (matches the user's proposed notation; less verbose for the common case `[-10, -10, w+20, h+20]`). Named-tuple syntax (`readonly [x: number, ...]`) gives IDE hints on hover.
- The `contentRect` field in dims is constant `[0, 0, elementPixel[0], elementPixel[1]]` — provided as a convenience so effects can compose helper utilities (e.g. user-side `outset(contentRect, n)`) without rebuilding it.
- `srcRect` at stage 0 equals `contentRect` (capture is element-only; no pad).
- For post-effect chains the "element" equals the canvas, so `contentRect == canvasRect`. Returning `canvasRect` makes the dst rect cover the full canvas — semantically equivalent to the old `fullscreenPad = 0`.
