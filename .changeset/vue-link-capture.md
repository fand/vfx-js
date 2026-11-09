---
"@vfx-js/vue": patch
---

Fix `v-transition` on `<NuxtLink>`: the link spec was dropped, since NuxtLink prevents the click before the directive saw it.
