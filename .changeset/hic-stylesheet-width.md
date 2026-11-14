---
"@vfx-js/core": patch
---

Keep the width of an html-in-canvas target whose fixed width comes from a stylesheet or `#id` rule. The wrapper canvas used to grow to the full width of its parent during `addHTML` and transitions.

The wrapper width now comes from the element's computed width, min-width and max-width rather than its on-screen rect, so a `max-width: 100%` keeps tracking the parent and a scaled ancestor no longer shrinks the wrapper. Margins keep `auto` and `%`, so a target centered with `margin: 0 auto` stays centered after a resize.
