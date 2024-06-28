# VFX-JS API docs

<script>
    // Remove h2 header...
    document.querySelector(".tsd-page-title").remove();
</script>

This is the API docs for [VFX-JS](https://amagi.dev/vfx-js/).
In this API docs, we'll show the class, functions and parameters provided by VFX-JS.

---

VFX-JS allows you to add WebGL-powered visual effects to HTML elements; `<img>`s, `<video>`s and even `<div>`s.
To use VFX-JS, first install it from npm:

```
npm i @vfx-js/core
```

Then use it in your script:

```js
import { VFX } from "@vfx-js/core";

const vfx = new VFX();
vfx.add(element, { shader: "glitch" });
```

For more examples, visit the website:
[https://amagi.dev/vfx-js/](https://amagi.dev/vfx-js/)
