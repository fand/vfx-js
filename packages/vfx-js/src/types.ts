import THREE from "three";
import { ShaderPreset } from "./constants";

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
     */
    shader?: ShaderPreset | string;

    /**
     * The release time for transition shaders.
     */
    release?: number;

    /**
     * Uniform values to be passed to the shader.
     *
     * You can
     *
     */
    uniforms?: VFXUniforms;

    /**
     * Allow shader outputs to oveflow the original element area.
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
    overflow?:
        | true
        | number
        | [top: number, right: number, bottom: number, left: number]
        | { top?: number; right?: number; bottom?: number; left?: number };

    /**
     * Texture wrapping mode.
     *
     * You can pass a single value to specify both horizontal and vertical wrapping at once,
     * or you can provide a tuple to spefify different modes for horizontal / vertical wrapping.
     *
     * If not provided, VFX-JS will use "repeat" mode for both horizontal and vertical wrapping.
     */
    wrap?: VFXWrap | [VFXWrap, VFXWrap];
};

/**
 * Texture wrapping mode.
 * This corresponds to `gl.CLAMP_TO_EDGE`, `gl.REPEAT` and `gl.MIRRORED_REPEAT` in WebGL API.
 * ref. https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @notExported
 */
export type VFXWrap = "clamp" | "repeat" | "mirror";

export type VFXUniforms = {
    [name: string]: VFXUniformValue | (() => VFXUniformValue);
};

export type VFXUniformValue =
    | number // float
    | [number, number] // vec2
    | [number, number, number] // vec3
    | [number, number, number, number]; // vec4

/**
 * @internal
 */
export type VFXElementType = "img" | "video" | "text";

/**
 * @internal
 */
export type VFXElement = {
    type: VFXElementType;
    element: HTMLElement;
    isInViewport: boolean;
    width: number;
    height: number;
    scene: THREE.Scene;
    uniforms: { [name: string]: THREE.IUniform };
    uniformGenerators: { [name: string]: () => VFXUniformValue };
    startTime: number;
    enterTime: number;
    leaveTime: number;
    release: number;
    isGif: boolean;
    overflow: VFXElementOverflow;
    originalOpacity: number;
};

/**
 * @internal
 */
export type VFXElementOverflow =
    | "fullscreen"
    | { top: number; right: number; bottom: number; left: number };
