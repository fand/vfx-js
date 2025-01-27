import type * as THREE from "three";
import type { Backbuffer } from "./backbuffer.js";
import type { ShaderPreset } from "./constants.js";
import type { Rect, RectOpts } from "./rect.js";

/**
 * Options to initialize `VFX` class.
 */
export type VFXOpts = {
    /**
     * The pixelRatio of the WebGL rendering context.
     *
     * VFX-JS renders the output with `window.devicePixelRatio` by default.
     * This means the resolution of the WebGL canvas gets larger in high-DPI display devices (e.g. iPhone).
     *
     * However, you might find VFX-JS not being rendered smoothly, especially in low-end devices.
     * In such case, you can pass lower values to `pixelRatio` so VFX-JS can render in lower resolutions.
     *
     * For example, if `pixelRatio` is 0.5, VFX-JS renders in the half resolution of the native resolution.
     *
     * ref. https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
     */
    pixelRatio?: number;

    /**
     * `z-index` for the WebGL canvas.
     * This is useful if you want to place the canvas behind other DOM element, or vice versa.
     */
    zIndex?: number;
};

/**
 * Properties for the element passed to `VFX.add()`.
 */
export type VFXProps = {
    /**
     * Shader code or preset name.
     *
     * You can pass the preset name listed in [ShaderPreset](./ShaderPreset),
     * then VFX-JS will use the corresponding shader preset.
     *
     * You can also write the shader by yourself, and pass the shader code here.
     */
    shader?: ShaderPreset | string;

    /**
     * The release time for the element. (Default: `0`)
     *
     * Basically, VFX-JS starts rendering the element when the element entered the viewport,
     * and it stops rendering after it got out of the viewport by scroll etc.
     *
     * Setting `release` will let VFX-JS to continue rendering the element after it goes out the viewport for the given duration.
     * This is useful when the element has overflow and it has to be rendered after it left the viewport.
     */
    release?: number;

    /**
     * Uniform values to be passed to the shader.
     * `uniforms` should be a map of the uniform variable name and the value.
     *
     * ```js
     * vfx.add(element, { shader, uniforms: {
     *   myParam1: 1,
     *   myParam2: [1.0, 2.0],
     *   myColor:  [0, 0, 1, 1], // blue
     * }});
     * ```
     *
     * Then these values are available inside GLSL shader.
     *
     * ```glsl
     * uniform float myParam1;
     * uniform vec2 myParam2;
     * uniform vec4 myColor;
     * ```
     *
     * You can also use a function to return the value every frame.
     * This is useful to make a parameters that can change by time or user interactions.
     *
     * ```js
     * vfx.add(element, { shader, uniforms: {
     *   scroll: () => window.scrollY,
     * }});
     * ```
     *
     * Supported uniform types are defined as [`VFXUniformValue`](./VFXUniformValue).
     */
    uniforms?: VFXUniforms;

    /**
     * The opacity for the original HTML element. (Default: `false`)
     *
     * By default, VFX-JS hides the original element by setting its opacity to 0.
     * However, in some cases you might want not to hide the original element.
     * `overlay` allows you to specify the opacity to be set explicitly.
     *
     * If you pass `true`, VFX-JS will preserve the original element's opacity.
     *
     * You can also specify the opacity by passing a number.
     * For example, `overlay: 0.5` will set the opacity of the orignal element to 0.5.
     */
    overlay?: true | number;

    /**
     * Options to control transition behaviour.
     * These properties work similarly to the IntersectionObsrever options.
     */
    intersection?: {
        /** Threshold for the element to be considered "entered" to the viewport. */
        threshold?: number;

        /** Margin of the viewport to be used in intersection calculcation. */
        rootMargin?: RectOpts;
    };

    /**
     * Allow shader outputs to oveflow the original element area. (Default: `0`)
     *
     * If true, REACT-VFX will render the shader in fullscreen.
     * If number is specified, REACT-VFX adds paddings with the given value.
     *
     * You can also specify the overflow size for each direction like CSS's `padding` property.
     * If you pass an array, it will be parsed as the top, right, bottom and left overflow.
     * For example, `<VFXImg overflow={[0, 100, 200, 0]} />` will render the image with
     * 100px right padding and 200px bottom padding.
     *
     * If you pass an object like `<VFXImg overflow={{ top: 100 }} />`,
     * REACT-VFX will add paddings only to the given direction (only to the `top` in this example).
     */
    overflow?: true | RectOpts;

    /**
     * Texture wrapping mode. (Default: `"repeat"`)
     *
     * You can pass a single value to specify both horizontal and vertical wrapping at once,
     * or you can provide a tuple to spefify different modes for horizontal / vertical wrapping.
     *
     * If not provided, VFX-JS will use "repeat" mode for both horizontal and vertical wrapping.
     */
    wrap?: VFXWrap | [VFXWrap, VFXWrap];

    /**
     * Z-index inside WebGL world. (Default: `0`)
     *
     * VFX-JS renders elements in ascending order by `zIndex`.
     * For example, when we have elements with `zIndex: 1` and `zIndex: -1`, the second element is rendered first.
     * When elements have the same `zIndex`, they are rendered in the order they were added.
     */
    zIndex?: number;

    /**
     * GLSL version of the given shader. (Default: `"300 es"`)
     * If you want to use GLSL 100 (≒ WebGL 1) shader, pass `"100"` to this property.
     */
    glslVersion?: "100" | "300 es";

    /**
     * Whether the shader uses the backbuffer or not.
     */
    backbuffer?: boolean;
};

/**
 * Texture wrapping mode.
 * This corresponds to `gl.CLAMP_TO_EDGE`, `gl.REPEAT` and `gl.MIRRORED_REPEAT` in WebGL API.
 *
 * ref. https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @notExported
 */
export type VFXWrap = "clamp" | "repeat" | "mirror";

export type VFXUniforms = {
    [name: string]: VFXUniformValue | (() => VFXUniformValue);
};

/**
 * Type for the values of uniform variables.
 * Each of these corresponds to `float`, `vec2`, `vec3` and `vec4` in GLSL.
 */
export type VFXUniformValue =
    | number // float
    | [number, number] // vec2
    | [number, number, number] // vec3
    | [number, number, number, number]; // vec4

/**
 * @internal
 */
export type VFXElementType = "img" | "video" | "text" | "canvas";

/**
 * @internal
 */
export type VFXElement = {
    type: VFXElementType;
    element: HTMLElement;
    isInViewport: boolean;
    isInLogicalViewport: boolean;
    width: number;
    height: number;
    scene: THREE.Scene;
    mesh: THREE.Mesh;
    uniforms: { [name: string]: THREE.IUniform };
    uniformGenerators: { [name: string]: () => VFXUniformValue };
    startTime: number;
    enterTime: number;
    leaveTime: number;
    release: number;
    isGif: boolean;
    isFullScreen: boolean;
    overflow: Rect;
    intersection: VFXElementIntersection;
    originalOpacity: number;
    zIndex: number;
    backbuffer?: Backbuffer;
};

export type VFXElementIntersection = {
    threshold: number;
    rootMargin: Rect;
};
