---
"@vfx-js/react": minor
---

`<VFXProvider>` is now optional. Components outside a Provider share one VFX instance. Use the new `useVFXConfig` hook to set its options.

Note: components rendered outside any Provider used to render as plain DOM. They now create a shared canvas on `document.body`. A page with a Provider and components outside it has two canvases.

`<VFXProvider zIndex>` now works. It was ignored before.
