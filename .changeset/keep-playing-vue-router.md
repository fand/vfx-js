---
"@vfx-js/vue": minor
---

Support `keepPlaying` in `<VFXTransition>` from `@vfx-js/vue/router`.

- It renders the `<RouterView>` page in a `<Transition>` keyed by path, and the leaving page stays until core gives it back.
- `<RouterView>` must be a direct child. A `<RouterView v-slot>` works if the slot renders one root node.
