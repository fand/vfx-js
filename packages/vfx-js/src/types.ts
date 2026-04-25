import type { Backbuffer } from "./backbuffer.js";
import type { ShaderPreset } from "./constants.js";
import type { EffectChain } from "./effect-chain.js";
import type { Framebuffer } from "./gl/framebuffer.js";
import type { Pass } from "./gl/pass.js";
import type { GlslVersion, Uniforms } from "./gl/program.js";
import type { Texture } from "./gl/texture.js";
import type { Margin, MarginOpts } from "./rect.js";

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
 * Note: auto-bind matches only `uniform sampler2D <name>;` declarations —
 * `isampler2D` / `usampler2D` are not recognised, and integer render
 * targets are not currently supported.
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
     * Whether this pass's render target should persist across frames.
     * When enabled, the previous frame's output is available as
     * `sampler2D <target>` (i.e. the target name doubles as the
     * previous-frame texture, following the ISF convention).
     */
    persistent?: boolean;

    /**
     * Use 32-bit floating point render target. (Default: `false`)
     * Enable when storing non-visual data or values outside [0, 1].
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
     * SHADER PATH ONLY. Ignored by the effect path — effects control pad via
     * each effect's own `outputSize` return (pad / fullscreenPad). Setting
     * both `overflow` and `effect` emits a dev warning.
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

/**
 * Configuration for post effects that are applied to the final canvas output.
 *
 * Note: auto-bind matches only `uniform sampler2D <name>;` declarations —
 * `isampler2D` / `usampler2D` are not recognised, and integer render
 * targets are not currently supported.
 */
export type VFXPostEffect = {
    /**
     * Fragment shader code or preset name to be applied as a post effect.
     * You can pass a preset name from ShaderPreset (e.g., "invert", "grayscale", "sepia")
     * or provide custom shader code.
     *
     * The shader will receive the rendered canvas as a `sampler2D src` uniform.
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
     * Optional: mutually exclusive with `effect`. One of `shader` or `effect`
     * must be specified. If both are present, `effect` takes precedence and
     * a dev warning is emitted.
     */
    shader?: ShaderPreset | string;

    /**
     * Custom uniform values to be passed to the post effect shader.
     * Works the same way as element uniforms.
     */
    uniforms?: VFXUniforms;

    /**
     * Whether the post effect should persist across frames.
     * When enabled, the previous frame's output is available as `sampler2D backbuffer`.
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
     *
     * When set, the slot runs the Effect pipeline against the viewport
     * capture instead of the shader-based post-effect pass. Mutually
     * exclusive with `shader` — if both are specified, `effect` takes
     * precedence and a dev warning is emitted.
     */
    effect?: Effect | readonly Effect[];
};

// ---------------------------------------------------------------------------
// Effect API (public)
// ---------------------------------------------------------------------------

/**
 * Handle for a GPU texture exposed to effects.
 *
 * Always pass this (not an extracted inner reference) as a uniform; the
 * backend resolves to the current internal Texture at bind time. The
 * resolver form lets `ctx.src` transparently follow a text-element
 * re-render (which swaps the underlying texture).
 *
 * `width` / `height` are physical pixels of the source's native size.
 * They may read as 0 before the source is ready (e.g. HTMLImageElement
 * pre-load, HTMLVideoElement pre-play).
 */
export type EffectTexture = {
    readonly width: number;
    readonly height: number;
    readonly __brand: "EffectTexture";
};

/**
 * Render target handle.
 *
 * Do NOT retain the underlying texture reference separately — for
 * persistent (double-buffered) RTs the read texture rotates across
 * draws. Always pass the RT itself as a uniform value; the backend
 * resolves the current read texture at bind time.
 */
export type EffectRenderTarget = {
    readonly width: number;
    readonly height: number;
    readonly __brand: "EffectRenderTarget";
};

/**
 * Source types accepted by {@link EffectContext.wrapTexture}.
 * Mirrors the internal Texture source list plus a raw WebGLTexture
 * escape hatch for callers that uploaded via `ctx.gl` themselves.
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
 * Uniform value type.
 *
 * Dispatch is driven by the shader's active uniform type (inspected via
 * `gl.getActiveUniform`), not the JS type alone. For example `[1, 2]`
 * against `uniform ivec2 foo` uploads via `gl.uniform2i(loc, 1, 2)`.
 * `number[]` / typed arrays are polymorphic: length 9 → mat3, length 16
 * → mat4, otherwise array uniform matching the shader's declared type.
 * Length mismatches emit a dev warning and skip the upload.
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
     *
     * Omit → match element size × pixelRatio and auto-resize on element
     * resize. Specify a tuple (physical px) → fixed size, no auto-resize.
     */
    size?: readonly [number, number];

    /** Use 16F/32F render target. (Default: `false`) */
    float?: boolean;

    /**
     * Double-buffered across frames. (Default: `false`)
     *
     * Pass the RT itself as a uniform to read the previous frame's write;
     * after a draw to it the handle swaps internally.
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
          /**
           * Optional explicit vertex attribute location. GLSL: honored
           * via `gl.bindAttribLocation` before link. WGSL (future): must
           * match `@location(N)` in the user shader. Omit for GLSL;
           * specify when writing raw WGSL.
           */
          location?: number;
      };

/**
 * Geometry POJO. Maps 1:1 to a raw-WebGL VAO today and WebGPU
 * `GPUVertexBufferLayout` + `primitive.topology` tomorrow. Attribute
 * names (not shaderLocation numbers) are the user contract; backend
 * resolves to locations during program link.
 */
export type EffectGeometry = {
    /** Default: `"triangles"`. */
    mode?: "triangles" | "lines" | "lineStrip" | "points";
    /** `"position"` is conventional. */
    attributes: Record<string, EffectAttributeDescriptor>;
    indices?: Uint16Array | Uint32Array;
    instanceCount?: number;
    drawRange?: { start?: number; count?: number };
};

/**
 * Opaque handle for the effect's "target region" fullscreen quad.
 *
 * - element effect → element rect + overflow padding
 * - post effect    → viewport + scrollPadding
 *
 * Users cannot construct or extend it; treat it as an injected default.
 */
export type EffectQuad = { readonly __brand: "EffectQuad" };

export type EffectDrawOpts = {
    frag: string;
    vert?: string;
    /** Default: `ctx.quad`. */
    geometry?: EffectQuad | EffectGeometry;
    uniforms?: EffectUniforms;
    /**
     * `null` / omitted → use `ctx.output` (which may itself be null → canvas).
     * Passing `ctx.output` explicitly and passing `null` are equivalent.
     */
    target?: EffectRenderTarget | null;
};

/**
 * Read-only snapshot of VFXProps fields that survive the effect boundary.
 *
 * Orchestrator-level fields (overflow/intersection/release/overlay/zIndex/
 * wrap/type) are applied outside the Effect and NOT surfaced here.
 * `backbuffer` is intentionally omitted — use
 * `ctx.createRenderTarget({ persistent: true })` instead.
 */
export type EffectVFXProps = {
    /** Default: `true`. */
    readonly autoCrop: boolean;
    /** Default: `"300 es"`. */
    readonly glslVersion: "100" | "300 es";
};

/**
 * Context passed to each Effect lifecycle hook.
 *
 * The orchestrator mutates fields (src / output / time / mouse / ...) in
 * place between frames; effect authors should read values through the
 * ctx reference and not cache across frames.
 */
export type EffectContext = {
    readonly time: number;
    readonly deltaTime: number;
    readonly pixelRatio: number;
    /** Canvas resolution, physical px. */
    readonly resolution: readonly [number, number];
    /**
     * Element-local bottom-left origin, physical px. Bottom-left matches
     * GLSL `gl_FragCoord` convention.
     *
     * NOTE: diverges from the shader path's `mouse` uniform (canvas-space
     * and pass-dependent). Effect authors migrating a shader should
     * account for the new origin/space.
     */
    readonly mouse: readonly [number, number];
    /**
     * Viewport-local bottom-left origin, physical px. Same value across
     * all passes (no padding/buffer-space scaling).
     */
    readonly mouseViewport: readonly [number, number];
    readonly intersection: number;
    readonly enterTime: number;
    readonly leaveTime: number;
    /** Element capture texture (read-only input for the first stage). */
    readonly src: EffectTexture;
    /** Final target; `null` → canvas. */
    readonly output: EffectRenderTarget | null;
    /**
     * User-supplied uniforms from `VFXProps.uniforms`, resolved every
     * frame (function-valued entries are evaluated before `update`).
     * vfx-js's built-in uniforms (time/mouse/resolution/...) are NOT
     * included here — they are exposed as top-level ctx fields.
     */
    readonly uniforms: Readonly<Record<string, EffectUniformValue>>;
    readonly vfxProps: EffectVFXProps;
    /**
     * Canonical fullscreen NDC (-1..1) quad. Draws through it use the
     * target's viewport rect, so vertex shaders operate in NDC space
     * that maps 1:1 to the target region.
     *
     * Convenience varyings (default vertex shader only, omit `vert`):
     *
     *   `in vec2 uv;`
     *     0..1 over the full dst buffer (inner + pad).
     *
     *   `in vec2 uvInner;`
     *     Sampling UV pointing into `ctx.src`'s INNER region. Always usable
     *     as `texture(src, uvInner)` to fetch element content regardless of
     *     whether src is the capture (inner-only) or a prior stage's
     *     intermediate (buffer with pad). Computed as
     *     `srcInnerRect.xy + uvInnerDst * srcInnerRect.zw`.
     *
     *   `in vec2 uvInnerDst;`
     *     0..1 over the CURRENT dst buffer's inner region. Values outside
     *     `[0, 1]` mean the fragment is in the pad. Use for "am I inside
     *     the element?" gating.
     *
     * Auto-uploaded uniforms (for custom vertex shaders or advanced use):
     *   `uniform vec4 dstInnerRect;`  — dst inner sub-rect in buffer UV
     *                                  (xy = origin, zw = size).
     *   `uniform vec4 srcInnerRect;` — src inner sub-rect in src texture UV.
     *                                  `(0,0,1,1)` for capture; with pad
     *                                  for intermediate inputs.
     */
    readonly quad: EffectQuad;

    /** Allocate a render target. */
    createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget;

    /**
     * Wrap an externally-produced texture for use as a uniform.
     *
     * - `WebGLTexture` source requires `opts.size` (no JS-side
     *   introspection). Not registered for context-loss recovery:
     *   caller must re-allocate + re-wrap in `onContextRestored(cb)`.
     * - DOM sources carry their own dimensions and ARE registered for
     *   automatic restore.
     *
     * `autoUpdate` default:
     *   `HTMLVideoElement` / `HTMLCanvasElement` / `OffscreenCanvas` → true
     *   `HTMLImageElement` / `ImageBitmap` / `WebGLTexture`         → false
     *
     * No caching: calling `wrapTexture` twice with the same source
     * allocates two independent GPU textures. Hoist the call into
     * `init()` and reuse the handle across frames.
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
     * Dispatch a draw.
     *
     * Every call performs a full binding sequence (program → framebuffer
     * → viewport → blend → VAO → uniforms) before dispatch, so no state
     * leaks from one draw to the next. Raw `ctx.gl.*` state mutations
     * between draws are harmless.
     *
     * Called from `update()` it is a no-op (silently ignored, dev warning
     * once per host).
     */
    draw(opts: EffectDrawOpts): void;

    /**
     * Raw escape hatch: the live WebGL2 context VFX-JS renders into.
     *
     * Use for custom GL operations (DataTexture upload, extensions, MRT,
     * etc). Resources allocated via `ctx.gl` are the caller's
     * responsibility — release them in `dispose()` and re-allocate them
     * in `onContextRestored(cb)`.
     */
    readonly gl: WebGL2RenderingContext;

    /**
     * Subscribe to `webglcontextrestored`.
     *
     * Resources created via the high-level API (createRenderTarget /
     * wrapTexture / ctx.draw with EffectGeometry) are restored
     * automatically. Raw `ctx.gl`-allocated resources are the caller's
     * responsibility to rebuild.
     *
     * Returns an unsubscribe function; automatically unsubscribed on
     * dispose.
     */
    onContextRestored(cb: () => void): () => void;
};

/**
 * Effect lifecycle interface.
 *
 * All hooks are optional:
 * - `init` runs once at registration, sequentially in array order.
 * - `update` runs every frame (state-update only; `ctx.draw` is a no-op).
 * - `render` runs every frame; omitting it makes the effect TRANSPARENT
 *   in the chain (no pass allocated, previous rendering effect's output
 *   flows directly to the next).
 * - `outputSize` declares the dimensions this effect writes into
 *   `ctx.output`. Default: input size, non-float. The LAST rendering
 *   effect's return value is ignored (its output is the fixed final
 *   target).
 * - `dispose` runs on element removal, reverse array order.
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
     * Declares how this effect extends its output buffer relative to src.
     * Called every frame; the chain reallocates the intermediate RT only
     * when resolved `{ size, float, pad }` differs from the previous frame.
     *
     * Omitted → the effect writes to a buffer of the same size as its src
     * (no pad added). Right choice for simple filters that don't grow
     * content (grayscale, invert, posterize).
     *
     * Only meaningful when `render` is present AND the effect is not the
     * last rendering effect in the chain (the last effect's output is the
     * fixed final target, so its return value is ignored).
     *
     * Return forms:
     *
     *   `{ pad: MarginOpts; float?: boolean }`
     *     Grow each side's pad by the given amount (physical px).
     *     `pad: 10` is shorthand for all sides. The dst buffer size
     *     becomes `elementPixel + (src pad + pad)` on each axis. Use
     *     `dims.fullscreenPad` to reach viewport edges.
     *
     *   `{ size: [w, h]; float?: boolean }` / `readonly [w, h]`
     *     Explicit absolute buffer size (physical px). Extra pixels
     *     (`buffer - elementPixel`) are distributed to each side of the
     *     pad proportionally to src's pad ratios (equal split when src
     *     has no pad). Buffer smaller than `elementPixel` on any axis
     *     triggers a dev warn + clamp.
     *
     * Units:
     *   input / elementPixel / viewportPixel / fullscreenPad / return →
     *     physical px
     *   element / viewport → logical px
     *   pixelRatio: element × pixelRatio === elementPixel
     *
     * Post-effect context: `element` / `elementPixel` mirror
     * `viewport` / `viewportPixel`; `fullscreenPad` is always zero.
     *
     * Pad tracking is entirely internal to the chain. Effects never
     * observe the accumulated pad — they declare deltas via `pad`, or
     * absolute buffer sizes. For "reach viewport edges" the chain provides
     * `dims.fullscreenPad` — the exact `pad` needed from src's current
     * pad to hit the viewport (>= 0 per side).
     */
    outputSize?(dims: {
        readonly input: readonly [number, number];
        readonly element: readonly [number, number];
        readonly elementPixel: readonly [number, number];
        readonly viewport: readonly [number, number];
        readonly viewportPixel: readonly [number, number];
        readonly pixelRatio: number;
        /**
         * Physical-px pad delta needed to extend src to viewport edges,
         * per side. Non-negative; 0 means src already spans that edge.
         * Always zero for post-effects (src already spans the viewport).
         */
        readonly fullscreenPad: {
            readonly top: number;
            readonly right: number;
            readonly bottom: number;
            readonly left: number;
        };
    }):
        | readonly [number, number]
        | {
              readonly size: readonly [number, number];
              readonly float?: boolean;
          }
        | {
              readonly pad: MarginOpts;
              readonly float?: boolean;
          };
}
