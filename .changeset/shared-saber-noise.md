---
"@vfx-js/effects": patch
---

Reuse Core noise for Halo distortion when the noise inputs match, eliminating a duplicate GPU pass and texture without changing the output.
