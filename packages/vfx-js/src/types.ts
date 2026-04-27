import type { Backbuffer } from "./backbuffer.js";
import type { ShaderPreset } from "./constants.js";
import type { EffectChain } from "./effect-chain.js";
import type { Framebuffer } from "./gl/framebuffer.js";
import type { Pass } from "./gl/pass.js";
import type { GlslVersion, Uniforms } from "./gl/program.js";
import type { Texture } from "./gl/texture.js";
import type { ElementRect, Margin, MarginOpts } from "./rect.js";

export type { GlslVersion } from "./gl/program.js";

/**
 * @deprecated Use `float?: boolean` instead.
 */
export type VFXTextureFormat = "RGBA" | "Float";

/**
 * A single render pass in a multipass shader pipeline.
 *
 * Each pass renders to a named buffer (specified by `target`), which can be
 * referenced as a `sampler2D` uniform in subsequent passes.
 * The last pass in the array renders to the screen.
 *
 * Note: auto-bind matches only `uniform sampler2D <name>;` declarations.
 * `isampler2D` / `usampler2D` are not supported yet.
 */
export type VFXPass = {
    /**
     * Vertex shader code.
     * If omitted, the default vertex shader is used.
     */
    vert?: string;

    /** Fragment shader code. */
    frag: string;

    /**
     * Name of the buffer to write this pass's output to.
     * Later passes can reference it as `uniform sampler2D <target>;`.
     *
     * If specified, output is written to a named render target.
     * If omitted on an intermediate pass, auto-assigned as `pass0`, `pass1`, etc.
     * If omitted on the last pass, renders to screen.
     */
    target?: string;

    /**
     * Whether the render target should persist across frames.
     * If enabled, the previous output is available as `sampler2D <target>`.
     */
    persistent?: boolean;

    /**
     * Use 32-bit floating point render target. (Default: `false`)
     */
    float?: boolean;

    /**
     * Render target size in pixels `[width, height]`.
     * When set, the backbuffer and intermediate buffer are created at this
     * fixed size instead of the viewport resolution.
     */
    size?: [number, number];

    /**
     * Uniform values to be passed to this pass's shader.
     * Works the same way as element uniforms.
     */
    uniforms?: VFXUniforms;

    /** See {@link GlslVersion}. */
    glslVersion?: GlslVersion;
};

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

    /**
     * Whether VFX-JS should start playing animations automatically (Default: `true`).
     *
     * If false, you have to call `VFX.play()` manually to start animation,
     * or render frames only when it's necessary by calling `VFX.render()`.
     */
    autoplay?: boolean;

    /**
     * Option to control the dynamic scroll technique to reduce scroll jank (Default: `0.1`).
     *
     * If a number is given, VFX-JS will use the number as the padding ratio.
     * For example, if 0.2 is given, VFX-JS will add 20% of padding to the canvas.
     * (= the canvas width & height will be 140% of the window width & height)
     *
     * If `[number, number]` is given, VFX-JS will use the numbers as the horizontal & vertical padding ratio.
     * For example, if `[0, 0.2]` is given, VFX-JS will only add the vertical padding with 20% height.
     *
     * If you prefer not using the scroll jank technique, specify `false`.
     */
    scrollPadding?: number | [number, number] | false;

    /**
     * A wrapper element to append the WebGL canvas to instead of `document.body`.
     * Prevents scroll overflow caused by the canvas extending beyond the page.
     *
     * The wrapper must have `position: relative` and `overflow: hidden`,
     * and should be at the page origin (0, 0) containing all page content.
     *
     * @example
     * ```html
     * <div id="wrapper" style="position: relative; overflow: hidden;">
     *   <!-- page content -->
     * </div>
     * ```
     */
    wrapper?: HTMLElement;

    /**
     * Post effect to be applied to the final output.
     * You can specify a custom fragment shader to process the entire canvas output.
     * You can also pass `VFXPass[]` for a multipass post-effect chain.
     */
    postEffect?: VFXPostEffect | VFXPass[];
};

export type VFXOptsInner = {
    pixelRatio: number;
    zIndex: number | undefined;
    autoplay: boolean;
    fixedCanvas: boolean;
    scrollPadding: [number, number];
    wrapper: HTMLElement | undefined;
    postEffects: (VFXPostEffect | VFXPass)[];
};

/**
 * Parse VFXOpts and fill in the default values.
 * @internal
 */
export function getVFXOpts(opts: VFXOpts): VFXOptsInner {
    const defaultPixelRatio =
        typeof window !== "undefined" ? window.devicePixelRatio : 1;

    let scrollPadding: [number, number];
    if (opts.scrollPadding === undefined) {
        scrollPadding = [0.1, 0.1];
    } else if (opts.scrollPadding === false) {
        scrollPadding = [0, 0];
    } else if (Array.isArray(opts.scrollPadding)) {
        scrollPadding = [
            opts.scrollPadding[0] ?? 0.1,
            opts.scrollPadding[1] ?? 0.1,
        ];
    } else {
        scrollPadding = [opts.scrollPadding, opts.scrollPadding];
    }

    let postEffects: (VFXPostEffect | VFXPass)[];
    if (opts.postEffect === undefined) {
        postEffects = [];
    } else if (Array.isArray(opts.postEffect)) {
        postEffects = opts.postEffect;
    } else {
        postEffects = [opts.postEffect];
    }

    return {
        pixelRatio: opts.pixelRatio ?? defaultPixelRatio,
        zIndex: opts.zIndex ?? undefined,
        autoplay: opts.autoplay ?? true,
        fixedCanvas: opts.scrollPadding === false,
        scrollPadding,
        wrapper: opts.wrapper,
        postEffects,
    };
}

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
    shader?: ShaderPreset | string | VFXPass[];

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
        rootMargin?: MarginOpts;
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
     *
     * SHADER PATH ONLY. Ignored by the effect path — effects control
     * their dst rect via each effect's own `outputRect` return (use
     * `dims.canvasRect` to reach canvas edges). Setting both `overflow`
     * and `effect` emits a dev warning.
     */
    overflow?: true | MarginOpts;

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
     * Whether the shader uses the backbuffer or not.
     */
    backbuffer?: boolean;

    /**
     * Whether the input texture should be cropped to the element bounds. (Default: `true`)
     * If `true`, The preset shaders will crop the input texture automatically.
     *
     * Note: if you use custom shaders, you have to implement the cropping manually.
     * VFX-JS provides `uniform bool autoCrop;` to help this.
     */
    autoCrop?: boolean;

    /** See {@link GlslVersion}. */
    glslVersion?: GlslVersion;

    /**
     * Effect (or pipeline of effects) applied to this element.
     *
     * Mutually exclusive with `shader`. When both are specified, `effect`
     * takes precedence and a dev warning is emitted.
     *
     * A single Effect is normalized internally to a length-1 array. An empty
     * array emits a dev warning and copies the element capture directly to
     * the final target (identity chain).
     *
     * Effect instances are stateful: do NOT reuse the same Effect object
     * across multiple elements. Use a factory that returns a new Effect
     * per call.
     */
    effect?: Effect | readonly Effect[];
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
 * Scalars/tuples map to GLSL `float`/`vec2`/`vec3`/`vec4`. Flat numeric
 * arrays (e.g. `Float32Array`) map to array uniforms — a `Float32Array`
 * of length `N*4` feeds `uniform vec4 foo[N]` (or `uniform float foo[N*4]`).
 */
export type VFXUniformValue =
    | number // float
    | [number, number] // vec2
    | [number, number, number] // vec3
    | [number, number, number, number] // vec4
    | number[]
    | Float32Array
    | Int32Array
    | Uint32Array;

/**
 * @internal
 */
export type VFXElementType = "img" | "video" | "text" | "canvas" | "hic";

/**
 * @internal
 */
export type VFXElementPass = {
    pass: Pass;
    uniforms: Uniforms;
    uniformGenerators: { [name: string]: () => VFXUniformValue };
    target?: string;
    persistent?: boolean;
    float?: boolean;
    size?: [number, number];
    backbuffer?: Backbuffer;
};

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
    passes: VFXElementPass[];
    bufferTargets: Map<string, Framebuffer>;
    startTime: number;
    enterTime: number;
    leaveTime: number;
    release: number;
    isGif: boolean;
    isFullScreen: boolean;
    overflow: Margin;
    intersection: VFXElementIntersection;
    originalOpacity: number;
    srcTexture: Texture;
    zIndex: number;
    backbuffer?: Backbuffer;
    autoCrop: boolean;
    /** Present only for effect-path elements. */
    chain?: EffectChain;
    /** Per-frame evaluated generators for effect-path uniforms. */
    effectUniformGenerators?: Record<string, () => EffectUniformValue>;
    /** Static effect-path uniforms (merged with generator results). */
    effectStaticUniforms?: Record<string, EffectUniformValue>;
    /** Wall-clock seconds of the previous render. Used for ctx.deltaTime. */
    effectLastRenderTime?: number;
};

export type VFXElementIntersection = {
    threshold: number;
    rootMargin: Margin;
};

/** Configuration for post effects that are applied to the final canvas output. */
export type VFXPostEffect = {
    /**
     * Fragment shader code or preset name to be applied as a post effect.
     * You can pass a preset name from ShaderPreset (e.g., "invert", "grayscale", "sepia")
     * or provide custom shader code.
     *
     * The shader will receive the whole canvas as `sampler2D src`.
     *
     * Standard uniforms available:
     * - `sampler2D src`: The input texture (rendered canvas)
     * - `vec2 resolution`: Canvas resolution in pixels
     * - `vec2 offset`: Offset values
     * - `vec4 viewport`: Viewport information
     * - `float time`: Time in seconds since VFX started
     * - `vec2 mouse`: Mouse position in pixels
     * - `sampler2D backbuffer`: Previous frame texture (if persistent is enabled)
     *
     * Optional: `shader` and `effect` are mutually exclusive.
     * If both are present, `effect` takes precedence.
     */
    shader?: ShaderPreset | string;

    /**
     * Custom uniform values to be passed to the post effect shader.
     * Works the same way as element uniforms.
     */
    uniforms?: VFXUniforms;

    /**
     * Whether the post effect should persist across frames.
     * If enabled, the previous output is available as `sampler2D backbuffer`.
     */
    persistent?: boolean;

    /**
     * Use 32-bit floating point render target. (Default: `false`)
     */
    float?: boolean;

    /** See {@link GlslVersion}. */
    glslVersion?: GlslVersion;

    /**
     * Effect (or pipeline of effects) to apply in this post-effect slot.
     */
    effect?: Effect | readonly Effect[];
};

// ---------------------------------------------------------------------------
// Effect API (public)
// ---------------------------------------------------------------------------

/**
 * A handle to a GPU texture.
 *
 * Effect APIs (`ctx.src`, `ctx.wrapTexture()`) returns
 * `EffectTexture` as the handle of raw WebGL texture.
 * To use these textures, you need to pass this handle as `uniform`.
 *
 * `width` / `height` are physical pixels of the source's native size
 * (`0` for images / videos that haven't loaded yet).
 */
export type EffectTexture = {
    readonly width: number;
    readonly height: number;
    readonly __brand: "EffectTexture";
};

/**
 * A handle to an offscreen render target.
 *
 * `ctx.createRenderTarget(...)` returns `EffectRenderTarget` as
 * the handle of the raw WebGL framebuffer.
 * You can use it as a draw target (`ctx.draw({ target: rt })`) and
 * as a `sampler2D` uniform to read it back in a later pass.
 *
 * `width` / `height` are physical pixels.
 */
export type EffectRenderTarget = {
    readonly width: number;
    readonly height: number;
    readonly __brand: "EffectRenderTarget";
};

/**
 * Source types accepted by {@link EffectContext.wrapTexture}.
 */
export type EffectTextureSource =
    | WebGLTexture
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap
    | OffscreenCanvas;

export type EffectTextureWrap = "clamp" | "repeat" | "mirror";
export type EffectTextureFilter = "nearest" | "linear";

/**
 * A value you can assign to a shader uniform.
 * The upload variant (`uniform1f` etc) is picked automatically
 * from the shader's declared uniform type.
 */
export type EffectUniformValue =
    | number
    | boolean
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | number[]
    | Float32Array
    | Int32Array
    | Uint32Array
    | EffectTexture
    | EffectRenderTarget;

export type EffectUniforms = { [name: string]: EffectUniformValue };

export type EffectRenderTargetOpts = {
    /**
     * Size in physical pixels.
     * If omitted, the target size will follow the source element size
     * (`element size * pixelRatio`, auto-resized)
     */
    size?: readonly [number, number];

    /** Use 16F/32F render target. (Default: `false`) */
    float?: boolean;

    /**
     * Whether the target content should persist across frames (Default: `false`).
     * Useful for feedback effects like trails or motion blur.
     */
    persistent?: boolean;

    /** Default: `"clamp"`. Tuple form specifies `[wrapS, wrapT]`. */
    wrap?: EffectTextureWrap | readonly [EffectTextureWrap, EffectTextureWrap];

    /** Default: `"linear"`. */
    filter?: EffectTextureFilter;
};

export type EffectAttributeTypedArray =
    | Float32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array;

export type EffectAttributeDescriptor =
    | EffectAttributeTypedArray
    | {
          data: EffectAttributeTypedArray;
          itemSize: 1 | 2 | 3 | 4;
          normalized?: boolean;
          /** ANGLE_instanced_arrays / WebGPU `stepMode: "instance"`. */
          perInstance?: boolean;
      };

/**
 * Custom geometry for `ctx.draw({ geometry })`.
 */
export type EffectGeometry = {
    /** Primitive type to draw. (Default: `"triangles"`) */
    mode?: "triangles" | "lines" | "lineStrip" | "points";

    /**
     * Vertex attributes keyed by name.
     * Names must match the `attribute` / `in` declarations
     * in your vertex shader (`"position"` is conventional).
     */
    attributes: Record<string, EffectAttributeDescriptor>;

    /** Optional index buffer for indexed drawing. */
    indices?: Uint16Array | Uint32Array;

    /** Number of instances for instanced drawing. */
    instanceCount?: number;

    /** Restrict the draw call to a sub-range of vertices/indices. */
    drawRange?: { start?: number; count?: number };
};

/**
 * Opaque handle for the default fullscreen quad.
 * `ctx.draw()` uses it by default when `geometry` is omitted.
 * See `EffectContext.quad` for details.
 */
export type EffectQuad = { readonly __brand: "EffectQuad" };

export type EffectDrawOpts = {
    frag: string;
    vert?: string;

    /** Default: `ctx.quad`. */
    geometry?: EffectQuad | EffectGeometry;
    uniforms?: EffectUniforms;

    /**
     * Render target of the effect.
     * It renders to the Canvas if omitted (or `null`).
     */
    target?: EffectRenderTarget | null;
};

/** Subset of `VFXProps` exposed to effects via `ctx.vfxProps`. */
export type EffectVFXProps = {
    /** Default: `true`. */
    readonly autoCrop: boolean;
    /** Default: `"300 es"`. */
    readonly glslVersion: "100" | "300 es";
};

/**
 * Context passed to each Effect lifecycle hook.
 * Fields are updated each frame automatically.
 */
export type EffectContext = {
    readonly time: number;
    readonly deltaTime: number;
    readonly pixelRatio: number;

    /** Canvas resolution, physical px. */
    readonly resolution: readonly [number, number];

    /** Mouse position on the element (element-local, bottom-left origin). */
    readonly mouse: readonly [number, number];

    /** Mouse position on the canvas (canvas-local, bottom-left origin). */
    readonly mouseViewport: readonly [number, number];

    readonly intersection: number;
    readonly enterTime: number;
    readonly leaveTime: number;

    /** Element capture texture (read-only input for the first stage). */
    readonly src: EffectTexture;

    /** Destination assigned to this stage. `null` means the canvas. */
    readonly target: EffectRenderTarget | null;

    /**
     * User-defined uniforms from `VFXProps.uniforms`
     * Values are re-evaluated every frame efore `update()`.
     * Built-in uniforms (time etc) are exposed as top-level ctx fields instead.
     */
    readonly uniforms: Readonly<Record<string, EffectUniformValue>>;
    readonly vfxProps: EffectVFXProps;

    /** Default fullscreen quad (NDC -1..1), mapped to the target's viewport. */
    readonly quad: EffectQuad;

    /** Allocate a render target. */
    createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget;

    /**
     * Wrap an externally-produced texture for use as a uniform.
     *
     * Each call allocates a new GPU texture (no caching), so call this
     * once in `init()` and reuse the result across frames.
     *
     * - DOM sources: dimensions are read automatically, and the texture
     *   is restored after WebGL context loss.
     * - `WebGLTexture`: you must pass `opts.size`, and you must re-wrap
     *   the texture yourself from `onContextRestored(cb)`.
     *
     * `autoUpdate` defaults to `true` for `HTMLVideoElement`,
     * `HTMLCanvasElement`, and `OffscreenCanvas`, and `false` for
     * everything else.
     */
    wrapTexture(
        source: EffectTextureSource,
        opts?: {
            size?: readonly [number, number];
            autoUpdate?: boolean;
            wrap?:
                | EffectTextureWrap
                | readonly [EffectTextureWrap, EffectTextureWrap];
            filter?: EffectTextureFilter;
        },
    ): EffectTexture;

    /**
     * Run a draw call.
     * Only valid during `Effect.render()`; other calls are ignored.
     */
    draw(opts: EffectDrawOpts): void;

    /**
     * Raw WebGL2 context, for low-level operations
     * (DataTexture upload, extensions, MRT, etc).
     *
     * Resources allocated here are the caller's responsibility: free in
     * `dispose()`, rebuild in `onContextRestored(cb)`.
     */
    readonly gl: WebGL2RenderingContext;

    /**
     * Subscribe to `webglcontextrestored` to rebuild resources allocated
     * via raw `ctx.gl`. High-level API resources (`createRenderTarget`,
     * `wrapTexture`, `EffectGeometry`) are restored automatically.
     *
     * Returns an unsubscribe function; auto-unsubscribed on dispose.
     */
    onContextRestored(cb: () => void): () => void;
};

/**
 * Effect interface.
 *
 * Lifecycle hooks:
 * - `init`: called once on effect register
 * - `update`: called every frame, before `render`
 * - `render`: called every frame. Bypassed if omitted
 * - `dispose`: called once on removal
 *
 * `outputRect` declares the rect this stage writes into, in
 * element-local physical px. Defaults to the source rect (no growth).
 */
export interface Effect {
    init?(ctx: EffectContext): void | Promise<void>;

    /**
     * State-update phase. `ctx.src` / `ctx.output` may point to stale /
     * previous-frame handles here, so `ctx.draw()` MUST NOT be called.
     * If called, the orchestrator silently ignores it.
     */
    update?(ctx: EffectContext): void;

    /**
     * Render phase. Omit to make this effect transparent in the chain.
     */
    render?(ctx: EffectContext): void;

    dispose?(): void;

    /**
     * The rect this stage draws into, as `[x, y, w, h]`.
     *
     * Coordinates are in physical pixels, relative to the element, with
     * the origin at the bottom-left.
     *
     * Omit this method (or return `undefined`) when the effect does not
     * change the size of the content, such as a grayscale or invert
     * filter. The stage then draws into the same rect as its input.
     *
     * Some common rects to return:
     * - `dims.contentRect` — just the element, with no extra space.
     * - The element plus `px` extra pixels on every side, for effects
     *   like blur, glow, or drop shadow:
     *   `[-px, -px, elementPixel[0] + 2 * px, elementPixel[1] + 2 * px]`.
     * - `dims.canvasRect` — the whole canvas, including the
     *   `scrollPadding` area around the viewport.
     *
     * Each stage picks its own rect. If one stage returns 100×100 and
     * the next returns 50×50, those are the sizes used; rects do not
     * grow as the chain runs.
     *
     * Units in `dims`:
     * - Physical pixels: `contentRect`, `srcRect`, `canvasRect`, and
     *   the value you return.
     * - Logical (CSS) pixels: `element`, `canvas`. Multiply by
     *   `pixelRatio` to get the matching `elementPixel` / `canvasPixel`.
     *
     * In a post-effect there is no element, so `element` and
     * `elementPixel` are the same as `canvas` and `canvasPixel`, and
     * `contentRect` is the same as `canvasRect`.
     */
    outputRect?(dims: {
        readonly element: readonly [number, number];
        readonly elementPixel: readonly [number, number];
        readonly canvas: readonly [number, number];
        readonly canvasPixel: readonly [number, number];
        readonly pixelRatio: number;
        /** Element rect in element-local px: `[0, 0, elementPixel[0], elementPixel[1]]`. */
        readonly contentRect: ElementRect;
        /** Src buffer's rect in element-local px (= prev stage's `outputRect`, or `contentRect` at stage 0). */
        readonly srcRect: ElementRect;
        /** Canvas rect in element-local px. */
        readonly canvasRect: ElementRect;
    }): ElementRect | undefined;
}
