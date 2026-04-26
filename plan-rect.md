# Replace `outputSize` (pad-delta) with `outputRect` (element-local rect)

## Context

The current `Effect.outputSize()` API has accumulated several distinct return shapes (`{ pad: number }`, `{ pad: {top,right,bottom,left} }`, `{ size: [w,h] }`, `[w, h]`) that all converge on the same internal data — per-side pad accumulated across the chain. Two structural problems:

1. **`pad` is a delta, not absolute**: `{ pad: 10 }` means "add 10px to src pad on each side". Across multi-stage chains this accumulates (`[a({pad:10}), b({pad:10})]` → final pad = 20). The semantic mismatch with the method name `outputSize` ("return your size", not "return your delta") is a recurring source of confusion.
2. **Per-side info is canonical**: `rectContent.xy` depends on `pad.left`/`pad.bottom` directly, not just total size. The `size` form has to recover per-side via a `distributePad()` heuristic, breaking asymmetric pad use cases.

A cleaner abstraction: **each stage declares its own rect in element-local coordinates**. Each stage independent; no accumulation; no monotonic clamp; no heuristic recovery.

```
contentRect = [0, 0, elemW, elemH]               // element occupies origin
outset 10px = [-10, -10, elemW + 20, elemH + 20] // valid; rect extends past element
fullscreen  = dims.canvasRect                    // canvas in element-local coords
```

The chain converts rect → uniforms via the same affine map as today, so downstream (`uvSrc`/`uvContent`/`rectSrc`/`rectContent`) is unchanged.

## Recommended approach

Replace `outputSize` with `outputRect`. Drop pad accumulation, monotonic clamp, and `distributePad` heuristic. Internal chain state simplifies from `(srcPad, srcBufferSize, dstPad, dstBufferSize)` per stage to `dstRect` only.

### Public API

```typescript
/** [x, y, w, h] in element-local physical px, top-left origin. */
type ElementRect = readonly [number, number, number, number];

interface Effect {
    outputRect?(dims: {
        readonly element: readonly [number, number];      // logical px (CSS)
        readonly elementPixel: readonly [number, number]; // physical px
        readonly canvas: readonly [number, number];       // logical px (CSS)
        readonly canvasPixel: readonly [number, number];  // physical px
        readonly pixelRatio: number;
        /** Element rect in element-local px: `[0, 0, elementPixel[0], elementPixel[1]]`. */
        readonly contentRect: ElementRect;
        /** Src buffer's rect in element-local px (= prev stage's `outputRect`, or `contentRect` at stage 0). */
        readonly srcRect: ElementRect;
        /** Canvas rect in element-local px (= `[-elementOffsetX, -elementOffsetY, canvasW, canvasH]`). */
        readonly canvasRect: ElementRect;
    }): ElementRect | { rect: ElementRect; float?: boolean } | undefined;
}
```

Conventions:
- **Top-left origin**, +x right, +y down (CSS / `getBoundingClientRect` style).
- **Element-local**: element top-left = (0, 0); element bottom-right = (`elementPixel[0]`, `elementPixel[1]`).
- **Default (undefined / omitted)**: `dstRect = srcRect` (no growth, mirrors current "no `outputSize` = dst pad = src pad").
- **Returning a bare `ElementRect`** is shorthand for `{ rect, float: false }`.

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
    /** Stage's rect in element-local physical px. */
    dstRect: ElementRect;
    /** dst buffer size (= rect.w, rect.h). Cached for FBO sizing. */
    dstBufferSize: [number, number];
    float: boolean;
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
    // Validate: dstRect must contain contentRect (otherwise element gets clipped).
    // If not, warn + clamp to a containing rect.
    const validated = clampToContain(dstRect, contentRect);
    const dstBufferSize: [number, number] = [validated[2], validated[3]];
    const rectContent = rectInRect(contentRect, validated);
    // ...store, allocate intermediate, update outputViewport...
    srcRect = validated;
}
```

New helpers (in `effect-chain.ts` or `rect.ts`):
- `rectInRect(inner: ElementRect, outer: ElementRect): [number, number, number, number]` — returns inner's UV position within outer (`[(inner.x - outer.x)/outer.w, (inner.y - outer.y)/outer.h, inner.w/outer.w, inner.h/outer.h]`).
- `clampToContain(rect, mustContain): ElementRect` — ensures `rect` covers `mustContain` (extend rect on any side that's too small). Replaces the old `elementPixel` floor.

`#hostFrameDims`:
- `rectContent` from current stage's `dstRect`
- `rectSrc` from prev stage's `dstRect` (or `[0, 0, elementPixel.w, elementPixel.h]` mapped to itself = identity at stage 0)

### Removed

- `outputSize` method (replaced by `outputRect`)
- `{ pad: ... }`, `{ size: ... }`, `[w, h]` return forms
- `dims.fullscreenPad` / `fullscreenGrow` (use `canvasRect` directly)
- `Margin`-based pad tracking in `StageLayout` (`srcPad`, `srcBufferSize`, `dstPad` already removed in last commit; `Margin` itself stays in `rect.ts` for non-chain consumers)
- Monotonic clamp + `#warnedMonotonic` set
- `distributePad()` helper
- `#warnedClampBuffer` set

### Hit-test pad

`EffectChain.hitTestPadPhys` returns `Margin` for `vfx-player`'s visibility hit-test rect grow. Convert from `dstRect` of the last stage:
```typescript
const last = stages[M-1].dstRect;
return {
    top:    Math.max(0, -last[1]),
    right:  Math.max(0, (last[0] + last[2]) - elementPixel[0]),
    bottom: Math.max(0, (last[1] + last[3]) - elementPixel[1]),
    left:   Math.max(0, -last[0]),
};
```

## Files to modify

- `packages/vfx-js/src/types.ts`
  - Replace `outputSize?(...)` signature with `outputRect?(...)` per spec above.
  - Drop `MarginOpts` import in this section if unused after change.
  - Update JSDoc with rect convention + example.
- `packages/vfx-js/src/effect-chain.ts`
  - Rewrite `StageLayout`, `#resolveStages`, `#callOutputSize` (→ `#callOutputRect`), `#fullscreenPadFor` (→ `#canvasRectInElementLocal`), `#hostFrameDims`, `hitTestPadPhys`.
  - Add `rectInRect` and `clampToContain` helpers (or extract to `rect.ts`).
  - Drop `distributePad`, `rectForPad` (replaced by `rectInRect`), `#warnedMonotonic`, `#warnedClampBuffer`.
  - Update doc comments (top of file) describing the rect model.
- `packages/vfx-js/src/effect-chain.test.ts`
  - Rewrite outputSize-related tests for `outputRect`.
  - Delete `size`-form tests (5 cases).
  - Add a test for the rect API: stage independence (no monotonic clamp), asymmetric rects, default-undefined inherits srcRect.
- `packages/storybook/src/effects/bloom.ts`
  - `outputSize(dims): ...` → `outputRect(dims): ElementRect`. Use `dims.canvasRect` for fullscreen.
- `plan.md`
  - Replace pad-model description with rect-model. Update `outputSize` references → `outputRect`.

## Verification

1. **Type check + tests**: `npm --workspace=@vfx-js/core run test` — expect ~125 tests passing after rewriting outputSize tests + dropping size-form tests.
2. **Lint**: `npm run lint`.
3. **Manual smoke**: storybook stories — `bloom`, `crtBloom` (chain `[pixelate, scanline, bloom]`), other effect stories — should render identically to before. `pad: 'fullscreen'` should still cover scrollPadding.
4. **Single commit** unless type-flow forces a staged migration.

## Reused utilities

- `Margin` type in `rect.ts` — kept for hit-test return type; chain-internal use removed.
- `createMargin` — only used at the hit-test boundary now.

## Notes

- Coordinate origin (top-left) is documented choice; element-local rects with `(-10, -10)` outset read more naturally with top-left.
- Tuple `[x, y, w, h]` chosen over `{x, y, w, h}` for concision (matches the user's proposed notation; less verbose for the common case `[-10, -10, w+20, h+20]`).
- The `contentRect` field in dims is constant `[0, 0, elementPixel[0], elementPixel[1]]` — provided as a convenience so effects can compose helper utilities (`outset(contentRect, n)`) without rebuilding it.
- `srcRect` at stage 0 equals `contentRect` (capture is element-only; no pad).
- `canvasRect` for post-effect chains equals `contentRect` (post-effect's element mirrors the canvas), so `fullscreenPad` continues to be effectively zero — semantics preserved.
