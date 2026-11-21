---
"@vfx-js/effects": patch
"@vfx-js/transitions": patch
---

Require the `@vfx-js/core` version they are released with (`^<version>`, as the framework bindings do) instead of `>=1.6.0`. `@vfx-js/effects` uses `ctx.readPixels`, which `@vfx-js/core` 1.6.0 does not have.
