<div align="center">
  <a href="https://amagi.dev/vfx-js/" target="_blank"><img alt="VFX-JS" src="../docs/public/og_image.jpg" width="100%"/></a>
  <h1>VFX-JS: Visual Effects Framework for Web</h1>
  <br/>
  <br/>
</div>

VFX-JS is a JavaScript library to add WebGL-powered effects to your website.
You can easily attach it to normal `<img>`, `<video>` elements etc.


This is the core implementation of [REACT-VFX](https://github.com/fand/react-vfx).


## Usage

Install via npm:

```
npm i @vfx-js/core
```

Then create `VFX` object in your script:

```js
import { VFX } from '@vfx-js/core';

const img = document.querySelector('#img');

const vfx = new VFX();
vfx.add(img, { shader: "glitch", overflow: 100 });
```

## Examples

TBD: See VFX-JS website for now.

https://amagi.dev/vfx-js/


## Author

[AMAGI](https://twitter.com/amagitakayosi)

## LICENSE

MIT
