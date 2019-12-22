<div align="center">
  <h1><img alt="REACT-VFX" src="https://user-images.githubusercontent.com/1403842/71323457-c69e6900-2516-11ea-958c-b96b2121387b.png" width="100%"/></h1>
  <h2>WebGL effects for React elements!!</2>
  <br>
  <br>
</div>

## Install

```
npm i -S react-vfx
```

## Usage

REACT-VFX exports `VFXSpan`, `VFXImg` and `VFXVideo`.
These components works just like `<span>`, `<img>` and `<video>` - accepts all properties they have, but they are rendered in WebGL world with shader effects!

```ts
import * as VFX from 'react-vfx';

export default () => (
    <VFX.VFXProvider>
        {/* Render text as image, then apply the shader effect! */}
        <VFX.VFXSpan shader="rainbow">Hi there!</VFX.VFXSpan>

        {/* Render image with shader */}
        <VFX.VFXImg src="cat.png" alt="image" shader="rgbShift"/>

        {/* It also supports animated GIFs! */}
        <VFX.VFXImg src="doge.gif" shader="pixelate"/>

        {/* and videos! */}
        <VFX.VFXVideo src="mind_blown.mp4"
            autoplay playsinline loop muted
            shader="halftone"/>
    </VFX>
);
```

NOTE: `VFXSpan` doesn't work if the content includes child nodes.

```ts
// OK
<a href="http:s//example.com"><VFXSpan>Yo</VFXSpan></a>

// NG: link styles are not rendered correctly
<VFXSpan><a href="http:s//example.com">Yo</a></VFXSpan>
```

### Custom Shader

```ts
import { VFXSpan } from 'react-vfx';

const blink = `
uniform float time;
uniform float input;

void mainImage(vec2 uv, out vec4 color) {
    gl_FragColor = texture2D(input, uv) * step(.5, fract(time));
}
`;

export default = () => (
    <VFXSpan shader={blink}></VFXSpan>
);
```

<!-- #### Passing Uniforms

```ts
type Uniform = THREE.IUniform | number | number[];

type UniformObject = {
    [name: string]: THREE.IUniform;
}

type Uniforms = UniformObject | () => UniformObject;
```

```ts
import React, { useState } from 'react';

export default () => {
    const [count, setCount] = useState(0);

    return (
        <VFXImg src="main_texture.png"
            uniforms={{
                foo: [1, 2, 3], // vec3
                foo: [1, 2, 3], // vec3
                foo: [1, 2, 3] // vec3
            }}/>

        <button type="button" onClick={() => setCount(count + 1)}>
        <VFXImg src="main_texture.png"
            shader={animated}
            uniforms={{ count }}/>
    );
};
```

### Textures

```ts
<VFXImg src="main_texture.png" textures={["tex1.png", "tex2.png"]}/>
```

```glsl
uniform sampler2D input;
uniform sampler2D texture1;
uniform sampler2D texture2;
``` -->

## Future work

-   Passing custom uniforms
-   Passing custom textures

## Author

[VJ AMAGI](https://twitter.com/amagitakayosi)

## LICENSE

MIT
