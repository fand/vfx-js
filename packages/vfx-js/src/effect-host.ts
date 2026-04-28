import { Backbuffer } from "./backbuffer.js";
import {
    EFFECT_QUAD_TOKEN,
    EffectGeometryCache,
    isEffectQuad,
} from "./effect-geometry.js";
import type { GLContext } from "./gl/context.js";
import { Framebuffer } from "./gl/framebuffer.js";
import { applyBlend } from "./gl/pass.js";
import { Program, type Uniform, type Uniforms } from "./gl/program.js";
import type { Quad } from "./gl/quad.js";
import { Texture, type TextureWrap } from "./gl/texture.js";
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectDrawOpts,
    EffectGeometry,
    EffectRenderTarget,
    EffectRenderTargetOpts,
    EffectTexture,
    EffectTextureFilter,
    EffectTextureSource,
    EffectTextureWrap,
    EffectUniforms,
    EffectUniformValue,
    EffectVFXProps,
} from "./types.js";

// ---------------------------------------------------------------------------
// Internal resolver shapes — hidden from the public EffectTexture /
// EffectRenderTarget types via Symbol keys.
// ---------------------------------------------------------------------------

const RESOLVE_TEXTURE = Symbol.for("@vfx-js/effect.resolve-texture");
const RESOLVE_RT = Symbol.for("@vfx-js/effect.resolve-rt");

/** @internal */
export type EffectTextureInternal = EffectTexture & {
    readonly [RESOLVE_TEXTURE]: () => Texture;
};

/** @internal */
export type EffectRenderTargetInternal = EffectRenderTarget & {
    readonly [RESOLVE_RT]: RenderTargetResolver;
};

type RenderTargetResolver = {
    /** Current read texture (for sampling the RT as a uniform). */
    getReadTexture(): Texture;

    /** Current write target (for `bindFramebuffer`). */
    getWriteFbo(): Framebuffer;

    /** Called after a draw that wrote to the RT. `persistent: true` only. */
    swap?: () => void;

    /** Called when the host's element size changes (auto-tracking RTs). */
    resize?: (bufferW: number, bufferH: number) => void;
    dispose?: () => void;
};

function resolveTexture(h: EffectTexture): Texture {
    return (h as EffectTextureInternal)[RESOLVE_TEXTURE]();
}

function resolveRt(h: EffectRenderTarget): RenderTargetResolver {
    return (h as EffectRenderTargetInternal)[RESOLVE_RT];
}

// ---------------------------------------------------------------------------
// Default vertex shaders (300 es / 100). Emit three varyings, nested
// largest-to-smallest in the [0, 1] range:
//   uv        — 0..1 over the full dst buffer (= captured content + pad)
//   uvSrc     — 0..1 over the src buffer (capture-only, or prior stage's
//               intermediate including its pad)
//   uvContent — 0..1 over the captured content (element / HTML subtree);
//               outside [0, 1] indicates pad
// Driven by two auto-uploaded uniforms:
//   contentRectUv (vec4) — content sub-rect within dst buffer UV
//   srcRectUv (vec4) — content sub-rect within src texture UV
// ---------------------------------------------------------------------------

const DEFAULT_VERT_300 = `#version 300 es
precision highp float;
in vec3 position;
out vec2 uv;
out vec2 uvContent;
out vec2 uvSrc;
uniform vec4 contentRectUv;
uniform vec4 srcRectUv;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - contentRectUv.xy) / contentRectUv.zw;
    uvSrc = srcRectUv.xy + uvContent * srcRectUv.zw;
    gl_Position = vec4(position, 1.0);
}
`;

const DEFAULT_VERT_100 = `
precision highp float;
attribute vec3 position;
varying vec2 uv;
varying vec2 uvContent;
varying vec2 uvSrc;
uniform vec4 contentRectUv;
uniform vec4 srcRectUv;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - contentRectUv.xy) / contentRectUv.zw;
    uvSrc = srcRectUv.xy + uvContent * srcRectUv.zw;
    gl_Position = vec4(position, 1.0);
}
`;

// Minimal passthrough copy fragment shader (300 es). Used for the
// stageCount=0 identity copy and render-failure fallback.
const PASSTHROUGH_FRAG_300 = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`;

const PASSTHROUGH_FRAG_100 = `
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`;

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

/** Element-scope dimensions the orchestrator updates each frame. @internal */
export type HostFrameDims = {
    /** Device-px size of the write buffer for this stage. */
    outputBufferW: number;
    outputBufferH: number;

    /** Canvas device-px size (for `ctx.resolution`). */
    canvasBufferSize: readonly [number, number];

    /**
     * Device-px viewport used when the draw's target is the stage's
     * assigned `ctx.target` (or `null` / omitted). For intermediate
     * stages this is `(0, 0, bufferW, bufferH)`; for the last stage it
     * is the canvas-space element rect (bottom-left origin). User-
     * allocated RTs keep their full-dim viewport regardless.
     */
    outputViewport: { x: number; y: number; w: number; h: number };

    /**
     * Current element device-px size (inner, no pad). Provided for
     * effects that need the inner extent — auto-resize RTs use
     * `outputBufferW/H` (= dst buffer = inner + dstPad) instead so they
     * include this stage's pad region.
     */
    elementBufferW: number;
    elementBufferH: number;

    /**
     * `contentRectUv` uniform value (dst): inner origin + inner size in
     * buffer-fraction units (0..1). See plan.md "`uvSrc` varying".
     */
    contentRectUv: [number, number, number, number];

    /**
     * `srcRectUv` uniform value (src): sampling origin + size in src
     * texture UV. Drives `uvSrc = srcRectUv.xy + uvContent *
     * srcRectUv.zw` in the default vertex shader.
     */
    srcRectUv: [number, number, number, number];
};

type Phase = "init" | "update" | "render" | "disposed";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type OwnedRT = {
    handle: EffectRenderTargetInternal;
    resolver: RenderTargetResolver;
};

/**
 * One-to-one owner of an Effect's `EffectContext`.
 *
 * The orchestrator ({@link EffectChain}) mutates fields on `ctx` each
 * frame (time / src / output / etc.) for reference stability and to
 * reduce allocations. Owns:
 * - Program cache (keyed `frag + "\0" + vert`)
 * - Managed Framebuffer / Backbuffer / Texture / VAO entries
 * - Phase flag for `ctx.draw()` suppression in the update phase
 *
 * See plan.md "effect-host.ts" for the full behavior spec.
 * @internal
 */
export class EffectHost {
    #glCtx: GLContext;
    #gl: WebGL2RenderingContext;
    #pixelRatio: number;
    #programs = new Map<string, Program>();
    #geometries: EffectGeometryCache;
    #ownedTextures: Texture[] = [];
    #ownedRTs: OwnedRT[] = [];
    #autoResizeRTs: OwnedRT[] = [];
    #restoredUnsubs: (() => void)[] = [];
    #phase: Phase = "init";
    #warnedDrawInUpdate = false;
    #dims: HostFrameDims;

    /**
     * Same object as `this.ctx`, typed as mutable for internal frame
     * updates. The chain writes to fields here; user effects see the
     * `readonly` view via `this.ctx`.
     */
    #mutCtx: Mutable<EffectContext>;

    constructor(
        glCtx: GLContext,
        quad: Quad,
        pixelRatio: number,
        initialSrc: EffectTexture,
        initialVfxProps: EffectVFXProps,
    ) {
        this.#glCtx = glCtx;
        this.#gl = glCtx.gl;
        this.#pixelRatio = pixelRatio;
        this.#geometries = new EffectGeometryCache(glCtx, quad);
        this.#dims = {
            outputBufferW: 1,
            outputBufferH: 1,
            canvasBufferSize: [1, 1],
            outputViewport: { x: 0, y: 0, w: 1, h: 1 },
            elementBufferW: 1,
            elementBufferH: 1,
            contentRectUv: [0, 0, 1, 1],
            srcRectUv: [0, 0, 1, 1],
        };
        const initialDims: EffectDims = {
            element: [1, 1],
            elementPixel: [1, 1],
            canvas: [1, 1],
            canvasPixel: [1, 1],
            pixelRatio,
            contentRect: [0, 0, 1, 1],
            srcRect: [0, 0, 1, 1],
            canvasRect: [0, 0, 1, 1],
        };
        const ctx: EffectContext = {
            time: 0,
            deltaTime: 0,
            pixelRatio,
            resolution: [1, 1],
            mouse: [0, 0],
            mouseViewport: [0, 0],
            intersection: 0,
            enterTime: 0,
            leaveTime: 0,
            src: initialSrc,
            target: null,
            uniforms: {},
            vfxProps: initialVfxProps,
            dims: initialDims,
            quad: EFFECT_QUAD_TOKEN,
            gl: this.#gl,
            createRenderTarget: (opts) => this.#createRenderTarget(opts),
            wrapTexture: (source, opts) => this.#wrapTexture(source, opts),
            draw: (opts) => this.#draw(opts),
            onContextRestored: (cb) => {
                const unsub = this.#glCtx.onContextRestored(cb);
                this.#restoredUnsubs.push(unsub);
                return unsub;
            },
        };
        this.#mutCtx = ctx as Mutable<EffectContext>;
    }

    get ctx(): EffectContext {
        return this.#mutCtx;
    }

    // -- orchestrator-facing API --------------------------------------------

    setPhase(p: Phase): void {
        this.#phase = p;
    }

    setFrameDims(dims: HostFrameDims): void {
        this.#dims = dims;
        this.#mutCtx.resolution = [
            dims.canvasBufferSize[0],
            dims.canvasBufferSize[1],
        ];
        // Auto-resize managed RTs whose size tracks this stage's dst
        // buffer (= element + dstPad). Sizing to dst buffer instead of
        // inner element ensures effects can write into the pad region
        // without manual sizing.
        for (const rt of this.#autoResizeRTs) {
            rt.resolver.resize?.(dims.outputBufferW, dims.outputBufferH);
        }
    }

    setEffectDims(dims: EffectDims): void {
        this.#mutCtx.dims = dims;
    }

    setFrameState(state: {
        time: number;
        deltaTime: number;
        mouse: [number, number];
        mouseViewport: [number, number];
        intersection: number;
        enterTime: number;
        leaveTime: number;
        uniforms: Record<string, EffectUniformValue>;
    }): void {
        const c = this.#mutCtx;
        c.time = state.time;
        c.deltaTime = state.deltaTime;
        c.mouse = state.mouse;
        c.mouseViewport = state.mouseViewport;
        c.intersection = state.intersection;
        c.enterTime = state.enterTime;
        c.leaveTime = state.leaveTime;
        c.uniforms = state.uniforms;
    }

    setSrc(src: EffectTexture): void {
        this.#mutCtx.src = src;
    }

    setOutput(output: EffectRenderTarget | null): void {
        this.#mutCtx.target = output;
    }

    // -- internal passthrough pass (used by chain for stageCount=0 / fallback)

    /**
     * Draws a passthrough copy of `src` into `target` using the host's
     * own program cache. The viewport passed in is device-px.
     */
    passthroughCopy(
        src: EffectTexture,
        target: EffectRenderTarget | null,
        viewport: { x: number; y: number; w: number; h: number },
    ): void {
        const prevPhase = this.#phase;
        this.#phase = "render";
        const prevOutput = this.#mutCtx.target;
        this.#mutCtx.target = target;
        try {
            const prevVp = this.#dims.outputViewport;
            this.#dims.outputViewport = { ...viewport };
            const glslVersion = this.#mutCtx.vfxProps.glslVersion;
            const frag =
                glslVersion === "100"
                    ? PASSTHROUGH_FRAG_100
                    : PASSTHROUGH_FRAG_300;
            this.#doDraw({
                frag,
                uniforms: { src },
                target,
            });
            this.#dims.outputViewport = prevVp;
        } finally {
            this.#mutCtx.target = prevOutput;
            this.#phase = prevPhase;
        }
    }

    /** Clears the given RT with `(0, 0, 0, 0)`. Device-px target. */
    clearRt(rt: EffectRenderTarget): void {
        const gl = this.#gl;
        const resolver = resolveRt(rt);
        gl.bindFramebuffer(gl.FRAMEBUFFER, resolver.getWriteFbo().fbo);
        gl.viewport(0, 0, rt.width, rt.height);
        gl.clearColor(0, 0, 0, 0);
        gl.disable(gl.SCISSOR_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // -- createRenderTarget -------------------------------------------------

    #createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget {
        const persistent = opts?.persistent ?? false;
        const float = opts?.float ?? false;
        const wrap = normalizeWrap(opts?.wrap);
        const filter = opts?.filter;
        const explicitSize = opts?.size;
        const sizeW = explicitSize ? explicitSize[0] : this.#dims.outputBufferW;
        const sizeH = explicitSize ? explicitSize[1] : this.#dims.outputBufferH;

        let resolver: RenderTargetResolver;
        let getW: () => number;
        let getH: () => number;

        if (persistent) {
            const pr = explicitSize ? 1 : this.#pixelRatio;
            const cssW = explicitSize ? sizeW : sizeW / pr;
            const cssH = explicitSize ? sizeH : sizeH / pr;
            const bb = new Backbuffer(this.#glCtx, cssW, cssH, pr, float, {
                wrap,
                filter,
            });
            resolver = {
                getReadTexture: () => bb.texture,
                getWriteFbo: () => bb.target,
                swap: () => bb.swap(),
                resize: explicitSize
                    ? undefined
                    : (bufferW, bufferH) => {
                          bb.resize(
                              bufferW / this.#pixelRatio,
                              bufferH / this.#pixelRatio,
                          );
                      },
                dispose: () => bb.dispose(),
            };
            getW = () => bb.target.width;
            getH = () => bb.target.height;
        } else {
            const fb = new Framebuffer(this.#glCtx, sizeW, sizeH, {
                float,
                wrap,
                filter,
            });
            resolver = {
                getReadTexture: () => fb.texture,
                getWriteFbo: () => fb,
                resize: explicitSize
                    ? undefined
                    : (bufferW, bufferH) => fb.setSize(bufferW, bufferH),
                dispose: () => fb.dispose(),
            };
            getW = () => fb.width;
            getH = () => fb.height;
        }

        const handle = makeEffectRenderTarget(resolver, getW, getH);
        const owned: OwnedRT = { handle, resolver };
        this.#ownedRTs.push(owned);
        if (!explicitSize) {
            this.#autoResizeRTs.push(owned);
        }
        return handle;
    }

    // -- wrapTexture --------------------------------------------------------

    #wrapTexture(
        source: EffectTextureSource,
        opts?: {
            size?: readonly [number, number];
            autoUpdate?: boolean;
            wrap?:
                | EffectTextureWrap
                | readonly [EffectTextureWrap, EffectTextureWrap];
            filter?: EffectTextureFilter;
        },
    ): EffectTexture {
        const wrap = normalizeWrap(opts?.wrap);
        const filter = opts?.filter;
        let texture: Texture;
        let getW: () => number;
        let getH: () => number;
        let autoUpdateFn: (() => void) | null = null;

        const isRawHandle = isWebGLTextureHandle(source);

        if (isRawHandle) {
            if (!opts?.size) {
                throw new Error(
                    "[VFX-JS] wrapTexture(WebGLTexture) requires opts.size",
                );
            }
            const [sw, sh] = opts.size;
            texture = new Texture(this.#glCtx, undefined, {
                autoRegister: false,
                externalHandle: source,
            });
            getW = () => sw;
            getH = () => sh;
        } else {
            // Re-cast into the DOM subunion: TS's `Exclude` collapses
            // against `WebGLTexture` because in the DOM lib it is an
            // empty interface, so every other member is assignable.
            const domSource = source as
                | HTMLImageElement
                | HTMLCanvasElement
                | HTMLVideoElement
                | ImageBitmap
                | OffscreenCanvas;
            texture = new Texture(this.#glCtx, domSource);
            const explicitSize = opts?.size;
            const readDim = (axis: "w" | "h"): number => {
                if (explicitSize) {
                    return axis === "w" ? explicitSize[0] : explicitSize[1];
                }
                if (
                    typeof HTMLImageElement !== "undefined" &&
                    domSource instanceof HTMLImageElement
                ) {
                    return axis === "w"
                        ? domSource.naturalWidth
                        : domSource.naturalHeight;
                }
                if (
                    typeof HTMLVideoElement !== "undefined" &&
                    domSource instanceof HTMLVideoElement
                ) {
                    return axis === "w"
                        ? domSource.videoWidth
                        : domSource.videoHeight;
                }
                const wc = domSource as { width: number; height: number };
                return axis === "w" ? wc.width : wc.height;
            };
            getW = () => readDim("w");
            getH = () => readDim("h");

            const videoLike =
                (typeof HTMLVideoElement !== "undefined" &&
                    domSource instanceof HTMLVideoElement) ||
                (typeof HTMLCanvasElement !== "undefined" &&
                    domSource instanceof HTMLCanvasElement) ||
                (typeof OffscreenCanvas !== "undefined" &&
                    domSource instanceof OffscreenCanvas);
            const autoUpdate = opts?.autoUpdate ?? videoLike;
            if (autoUpdate) {
                autoUpdateFn = () => {
                    texture.needsUpdate = true;
                };
            }
        }

        texture.wrapS = wrap[0];
        texture.wrapT = wrap[1];
        if (filter !== undefined) {
            texture.minFilter = filter;
            texture.magFilter = filter;
        }
        this.#ownedTextures.push(texture);
        if (autoUpdateFn) {
            this.#perFrameAutoUpdate.push(autoUpdateFn);
        }

        return makeEffectTexture(() => texture, getW, getH);
    }

    #perFrameAutoUpdate: (() => void)[] = [];

    /** Called by the chain at the start of the render phase. */
    tickAutoUpdates(): void {
        for (const fn of this.#perFrameAutoUpdate) {
            fn();
        }
    }

    // -- draw ---------------------------------------------------------------

    #draw(opts: EffectDrawOpts): void {
        if (this.#phase !== "render") {
            if (this.#phase === "update" && !this.#warnedDrawInUpdate) {
                this.#warnedDrawInUpdate = true;
                console.warn(
                    "[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().",
                );
            }
            return;
        }
        this.#doDraw(opts);
    }

    #doDraw(opts: EffectDrawOpts): void {
        const gl = this.#gl;
        const vert =
            opts.vert ??
            (this.#mutCtx.vfxProps.glslVersion === "100"
                ? DEFAULT_VERT_100
                : DEFAULT_VERT_300);
        const key = `${opts.frag} ${vert}`;
        let program = this.#programs.get(key);
        if (!program) {
            program = new Program(
                this.#glCtx,
                vert,
                opts.frag,
                this.#mutCtx.vfxProps.glslVersion,
            );
            this.#programs.set(key, program);
        }

        const ctxOutput = this.#mutCtx.target;
        const rawTarget =
            opts.target === undefined || opts.target === null
                ? ctxOutput
                : opts.target;
        // Writes to the stage's assigned target (explicit ctx.target, null,
        // or omitted) honor the chain-computed outputViewport. Writes to a
        // user-allocated RT get full-RT dims.
        const isStageOutput = rawTarget === null || rawTarget === ctxOutput;

        let fbo: WebGLFramebuffer | null;
        let vpX: number;
        let vpY: number;
        let vpW: number;
        let vpH: number;
        let swap: (() => void) | undefined;
        if (rawTarget === null) {
            fbo = null;
            vpX = this.#dims.outputViewport.x;
            vpY = this.#dims.outputViewport.y;
            vpW = this.#dims.outputViewport.w;
            vpH = this.#dims.outputViewport.h;
        } else {
            const resolver = resolveRt(rawTarget);
            fbo = resolver.getWriteFbo().fbo;
            if (isStageOutput) {
                vpX = this.#dims.outputViewport.x;
                vpY = this.#dims.outputViewport.y;
                vpW = this.#dims.outputViewport.w;
                vpH = this.#dims.outputViewport.h;
            } else {
                vpX = 0;
                vpY = 0;
                vpW = rawTarget.width;
                vpH = rawTarget.height;
            }
            swap = resolver.swap;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(vpX, vpY, vpW, vpH);
        gl.disable(gl.SCISSOR_TEST);
        applyBlend(gl, rawTarget === null ? "premultiplied" : "none");

        program.use();
        const uniforms = this.#buildUniforms(opts.uniforms);
        program.uploadUniforms(uniforms);

        const geometry = opts.geometry ?? EFFECT_QUAD_TOKEN;
        if (isEffectQuad(geometry)) {
            this.#geometries.quad.draw();
        } else {
            const compiled = this.#geometries.resolve(
                geometry as EffectGeometry,
                program,
            );
            compiled.draw();
        }

        if (swap) {
            swap();
        }
    }

    #buildUniforms(userUniforms: EffectUniforms | undefined): Uniforms {
        const out: Uniforms = {};
        // Auto uniforms: contentRectUv (dst) + srcRectUv (src).
        out["contentRectUv"] = { value: this.#dims.contentRectUv };
        out["srcRectUv"] = { value: this.#dims.srcRectUv };
        if (!userUniforms) {
            return out;
        }
        for (const [name, value] of Object.entries(userUniforms)) {
            out[name] = toInternalUniform(value);
        }
        return out;
    }

    // -- dispose ------------------------------------------------------------

    dispose(): void {
        this.#phase = "disposed";
        for (const unsub of this.#restoredUnsubs) {
            unsub();
        }
        this.#restoredUnsubs = [];
        for (const rt of this.#ownedRTs) {
            rt.resolver.dispose?.();
        }
        this.#ownedRTs = [];
        this.#autoResizeRTs = [];
        for (const t of this.#ownedTextures) {
            t.dispose();
        }
        this.#ownedTextures = [];
        for (const p of this.#programs.values()) {
            p.dispose();
        }
        this.#programs.clear();
        this.#geometries.dispose();
        this.#perFrameAutoUpdate = [];
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWebGLTextureHandle(
    source: EffectTextureSource,
): source is WebGLTexture {
    // WebGLTexture is an opaque interface (no instance methods), but a
    // runtime check against the global constructor works when available.
    // DOM-source types all expose `width`, `naturalWidth`, etc., so the
    // structural duck-check (no `width`, `naturalWidth`, `videoWidth`)
    // fallbacks correctly cover environments without the global.
    const globalWebGLTexture = (globalThis as Record<string, unknown>)
        .WebGLTexture as { prototype: object } | undefined;
    if (
        globalWebGLTexture &&
        typeof globalWebGLTexture === "function" &&
        source instanceof
            (globalWebGLTexture as unknown as {
                new (): WebGLTexture;
            })
    ) {
        return true;
    }
    const s = source as {
        width?: unknown;
        naturalWidth?: unknown;
        videoWidth?: unknown;
    };
    return (
        s.width === undefined &&
        s.naturalWidth === undefined &&
        s.videoWidth === undefined
    );
}

function normalizeWrap(
    w:
        | EffectTextureWrap
        | readonly [EffectTextureWrap, EffectTextureWrap]
        | undefined,
): [TextureWrap, TextureWrap] {
    if (w === undefined) {
        return ["clamp", "clamp"];
    }
    if (typeof w === "string") {
        return [w, w];
    }
    return [w[0], w[1]];
}

function toInternalUniform(value: EffectUniformValue): Uniform {
    if (typeof value === "object" && value !== null && "__brand" in value) {
        if (value.__brand === "EffectRenderTarget") {
            return { value: resolveRt(value).getReadTexture() };
        }
        return { value: resolveTexture(value) };
    }
    return { value };
}

/**
 * Build an EffectTexture handle that resolves to the given Texture each
 * time. The resolver callback form lets `ctx.src` transparently follow
 * a text-element re-render (which swaps `e.srcTexture`).
 * @internal
 */
export function makeEffectTexture(
    resolve: () => Texture,
    width: () => number,
    height: () => number,
): EffectTextureInternal {
    const handle = {
        __brand: "EffectTexture",
        get width() {
            return width();
        },
        get height() {
            return height();
        },
    } as EffectTextureInternal;
    Object.defineProperty(handle, RESOLVE_TEXTURE, { value: resolve });
    return handle;
}

/** @internal */
export function makeEffectRenderTarget(
    resolver: RenderTargetResolver,
    width: () => number,
    height: () => number,
): EffectRenderTargetInternal {
    const handle = {
        __brand: "EffectRenderTarget",
        get width() {
            return width();
        },
        get height() {
            return height();
        },
    } as EffectRenderTargetInternal;
    Object.defineProperty(handle, RESOLVE_RT, { value: resolver });
    return handle;
}

/**
 * Build an EffectRenderTarget handle over an already-allocated
 * Framebuffer. Used by the chain to expose intermediates / the final
 * post-effect target.
 * @internal
 */
export function makeEffectRenderTargetFromFb(
    fb: Framebuffer,
): EffectRenderTarget {
    const resolver: RenderTargetResolver = {
        getReadTexture: () => fb.texture,
        getWriteFbo: () => fb,
    };
    return makeEffectRenderTarget(
        resolver,
        () => fb.width,
        () => fb.height,
    );
}

/** Effect-host-owned type tag re-export for convenience. @internal */
export type { Effect };
// Re-export resolvers for the chain's internal use.
export { RESOLVE_RT, RESOLVE_TEXTURE, resolveRt, resolveTexture };
