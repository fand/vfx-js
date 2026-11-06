# @vfx-js/transitions

Page transition presets for [`@vfx-js/core`](https://www.npmjs.com/package/@vfx-js/core).

## Install

```bash
npm install @vfx-js/core @vfx-js/transitions
```

## Usage

```html
<div id="panel">
    <section id="home">...</section>
    <section id="about" hidden>...</section>
</div>
```

```ts
import { VFX } from "@vfx-js/core";
import { swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const t = vfx.addTransition(panel, { transition: swipe, duration: 0.6 });

// The sections are the slides. show() hides the others and animates to the one you pick.
await t.show("#about");
```

### gl-transitions

Use any shader from [gl-transitions](https://gl-transitions.com/):

```ts
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const cube = transitions.find((t) => t.name === "Cube")!;
await t.show("#about", { transition: createGLTransition(cube) });
```

See the [transition guide](https://github.com/fand/vfx-js/blob/main/docs/TRANSITION.md) for the full API and the preset list.

## License

MIT
