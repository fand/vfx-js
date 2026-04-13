# Progress: html-in-canvas sizing

## Current state

`wrapElement` rewritten to follow the WICG html-in-canvas pattern.
lint / build / test pass. Awaiting Storybook visual verification.

## Implemented (html-in-canvas.ts)

### wrapElement

1. **CSS identity copy**: `className` + `setAttribute("style")` to replicate element's CSS
2. **Literal overrides**: `display: block`, `padding: 0`, `border: none`, `box-sizing: content-box`
3. **Computed overrides**: display (inline→block), margin, position/flow
4. **Padding/border compensation**: when padding/border > 0, override width with `rect.width` (border-box)
5. **`width: 100%` fallback**: prevents intrinsic-size → RO feedback loop when no explicit CSS width
6. **Canvas RO** (`device-pixel-content-box`): pixel buffer sync + `onReflow`
7. **`onpaint`**: content change detection (when flag enabled)

### captureElement

- Fallback when RO hasn't fired yet (canvas.width === 0 → measure from child rect)

### unwrapElement

- Single RO disconnect (child RO / parent RO removed)

## Implemented (HtmlInCanvas.stories.ts)

- All stories use `play()` pattern (call `addHTML` after DOM insertion)
- `qs<T>()` helper consolidates querySelector non-null casts

## Findings

| Finding | Impact |
|---|---|
| `layoutsubtree` canvas auto-fits height | No child RO needed |
| `layoutsubtree` children are shrink-wrapped | Child width ≠ canvas width (known limitation) |
| Canvas without explicit CSS width uses intrinsic size | RO setting `canvas.width` causes feedback loop |
| `getComputedStyle` on detached element returns "" for all props | Stories must use play() to call addHTML after DOM insertion |
| dom2canvas doesn't auto-detect content mutation either | `vfx.update()` required without `onpaint` (existing behavior) |

## Known limitations

1. **Element-type selectors** (`div.foo`): won't match canvas
2. **Responsive with padding/border**: fixed px override loses responsiveness
3. **Structural selectors** (`:nth-child`): may break due to DOM restructuring
4. **`width: 100%` + margin**: auto-width elements with margin-left/right overflow slightly
5. **`width: 100%` + class-only width**: fallback may override class-derived width
6. **Same-size content mutation**: undetectable without `onpaint`

## Remaining tasks

- [ ] Storybook visual verification (AddHTML, BugFixedWidth, BugChildWithPadding, BugContentReflow)
- [ ] Fix issues found during verification
- [ ] Squash / PR cleanup
