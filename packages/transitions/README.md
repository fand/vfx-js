# @vfx-js/transitions

Page transition presets for [`@vfx-js/core`](https://www.npmjs.com/package/@vfx-js/core).

## Install

```bash
npm install @vfx-js/core @vfx-js/transitions
```

## Usage

```ts
import { VFX } from "@vfx-js/core";
import { swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector("#panel")!;
const t = vfx.addTransition(panel, { transition: swipe, duration: 0.6 });

await t.run(() => {
    panel.innerHTML = renderNextTab();
});
```

See the [transition guide](https://github.com/fand/vfx-js/blob/main/docs/TRANSITION.md) for the full API and the preset list.

## License

MIT
