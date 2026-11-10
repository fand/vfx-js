# @vfx-js/transitions

Page transition presets for [`@vfx-js/core`](https://www.npmjs.com/package/@vfx-js/core).
See every preset, framework setup and a playground on the
[transitions site](https://amagi.dev/vfx-js-transitions/).

> **Experimental.** The API may change in any 0.x release.

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
import { Swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const t = vfx.addTransition(panel, { transition: Swipe, duration: 0.6 });

// The sections are the slides. show() hides the others and animates to the one you pick.
await t.show("#about");
```

Each preset is a class. Pass the class with `params`, or an instance to change its params while it runs:

```ts
await t.show("#home", { transition: Swipe, params: { direction: "right" } });

const swipe = new Swipe({ direction: "up" });
t.show("#about", { transition: swipe });
swipe.params = { direction: "down" };
```

### gl-transitions

Use any shader from [gl-transitions](https://gl-transitions.com/):

```ts
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const Cube = createGLTransition(transitions.find((t) => t.name === "Cube")!);
await t.show("#about", { transition: Cube, params: { persp: 0.5 } });
```

See the [transition guide](https://github.com/fand/vfx-js/blob/main/docs/TRANSITION.md) for the full API and the preset list.

## License

MIT
