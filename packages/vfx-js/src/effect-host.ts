import { Backbuffer } from "./backbuffer.js";
import {
    EffectGeometryCache,
    EFFECT_QUAD_TOKEN,
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
    EffectDrawOpts,
    EffectGeometry,
    EffectQuad,
    EffectRenderTarget,
    EffectRenderTargetOpts,
    EffectTexture,
    EffectTextureFilter,
    EffectTextureSource,
    EffectTextureWrap,
    EffectUniformValue,
    EffectUniforms,
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
    resize?: (physW: number, physH: number) => void;
    dispose: () => void;
};

function resolveTexture(h: EffectTexture): Texture {
    return (h as EffectTextureInternal)[RESOLVE_TEXTURE]();
}

function resolveRt(h: EffectRenderTarget): RenderTargetResolver {
    return (h as EffectRenderTargetInternal)[RESOLVE_RT];
}

/** @internal — test helper. */
export function isEffectRenderTarget(v: unknown): v is EffectRenderTarget {
    return (
        typeof v === "object" &&
        v !== null &&
        (v as { __brand?: unknown }).__brand === "EffectRenderTarget"
    );
}

/** @internal — test helper. */
export function isEffectTexture(v: unknown): v is EffectTexture {
    return (
        typeof v === "object" &&
        v !== null &&
        (v as { __brand?: unknown }).__brand === "EffectTexture"
    );
}

// ---------------------------------------------------------------------------
// Default vertex shaders (300 es / 100). Emit three varyings:
//   uv         — 0..1 over the full dst buffer (inner + pad)
//   uvInnerDst — 0..1 over the CURRENT dst buffer's inner region (element
//                proper); outside [0, 1] indicates pad
//   uvInner    — src-sampling UV pointing into src's inner region; valid
//                whether src is capture (inner-only) or a prior stage's
//                intermediate (buffer with pad)
// Driven by two auto-uploaded uniforms:
//   uvInnerRect (vec4) — dst inner sub-rect in buffer UV
//   srcInnerRect (vec4) — src inner sub-rect in src texture UV
// ---------------------------------------------------------------------------

const DEFAULT_VERT_300 = `#version 300 es
precision highp float;
in vec3 position;
out vec2 uv;
out vec2 uvInnerDst;
out vec2 uvInner;
uniform vec4 uvInnerRect;
uniform vec4 srcInnerRect;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvInnerDst = (bufferUV - uvInnerRect.xy) / uvInnerRect.zw;
    uvInner = srcInnerRect.xy + uvInnerDst * srcInnerRect.zw;
    gl_Position = vec4(position, 1.0);
}
`;

const DEFAULT_VERT_100 = `
precision highp float;
attribute vec3 position;
varying vec2 uv;
varying vec2 uvInnerDst;
varying vec2 uvInner;
uniform vec4 uvInnerRect;
uniform vec4 srcInnerRect;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvInnerDst = (bufferUV - uvInnerRect.xy) / uvInnerRect.zw;
    uvInner = srcInnerRect.xy + uvInnerDst * srcInnerRect.zw;
    gl_Position = vec4(position, 1.0);
}
`;

// Minimal passthrough copy fragment shader (300 es). Used for the M=0
// identity copy and render-failure fallback.
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
    /** Physical-px size of the write buffer for this stage. */
    outputPhysW: number;
    outputPhysH: number;
    /** Canvas physical-px size for `resolution`. */
    canvasPhysW: number;
    canvasPhysH: number;
    /**
     * Physical-px viewport used when the draw's target is the stage's
     * assigned `ctx.output` (or `null` / omitted). For intermediate
     * stages this is `(0, 0, bufferW, bufferH)`; for the last stage it
     * is the canvas-space element rect (bottom-left origin). User-
     * allocated RTs keep their full-dim viewport regardless.
     */
    outputViewport: { x: number; y: number; w: number; h: number };
    /**
     * Current element physical size (used by auto-resize RTs). Equal to
     * the element rect in physical px (inner, no overflow) for element
     * effects, or the viewport for post effects.
     */
    elementPhysW: number;
    elementPhysH: number;
    /**
     * `uvInnerRect` uniform value (dst): inner origin + inner size in
     * buffer-fraction units (0..1). See plan.md "`uvInner` varying".
     */
    uvInnerRect: [number, number, number, number];
    /**
     * `srcInnerRect` uniform value (src): sampling origin + size in src
     * texture UV. Drives `uvInner = srcInnerRect.xy + uvInnerDst *
     * srcInnerRect.zw` in the default vertex shader.
     */
    srcInnerRect: [number, number, number, number];
};

type Phase = "init" | "update" | "render" | "disposed";

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
    readonly ctx: EffectContext;

    #glCtx: GLContext;
    #gl: WebGL2RenderingContext;
    #pixelRatio: number;
    #programs = new Map<string, Program>();
    #geometries: EffectGeometryCache;
    #ownedFbs: Framebuffer[] = [];
    #ownedBackbuffers: Backbuffer[] = [];
    #ownedTextures: Texture[] = [];
    #ownedRTs: OwnedRT[] = [];
    #autoResizeRTs: OwnedRT[] = [];
    #restoredUnsubs: (() => void)[] = [];
    #phase: Phase = "init";
    #warnedDrawInUpdate = false;
    #dims: HostFrameDims;

    // Mutable context fields — exposed as `readonly` through the public
    // EffectContext type. Internally we just assign to them each frame.
    #ctxBacking: {
        time: number;
        deltaTime: number;
        pixelRatio: number;
        resolution: [number, number];
        mouse: [number, number];
        mouseViewport: [number, number];
        intersection: number;
        enterTime: number;
        leaveTime: number;
        src: EffectTexture;
        output: EffectRenderTarget | null;
        uniforms: Record<string, EffectUniformValue>;
        vfxProps: EffectVFXProps;
    };

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
            outputPhysW: 1,
            outputPhysH: 1,
            canvasPhysW: 1,
            canvasPhysH: 1,
            outputViewport: { x: 0, y: 0, w: 1, h: 1 },
            elementPhysW: 1,
            elementPhysH: 1,
            uvInnerRect: [0, 0, 1, 1],
            srcInnerRect: [0, 0, 1, 1],
        };
        this.#ctxBacking = {
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
            output: null,
            uniforms: {},
            vfxProps: initialVfxProps,
        };
        this.ctx = this.#createContext();
    }

    // -- orchestrator-facing API --------------------------------------------

    setPhase(p: Phase): void {
        this.#phase = p;
    }

    setFrameDims(dims: HostFrameDims): void {
        this.#dims = dims;
        this.#ctxBacking.resolution = [dims.canvasPhysW, dims.canvasPhysH];
        // Auto-resize managed RTs whose size tracks the element.
        for (const rt of this.#autoResizeRTs) {
            rt.resolver.resize?.(dims.elementPhysW, dims.elementPhysH);
        }
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
        const b = this.#ctxBacking;
        b.time = state.time;
        b.deltaTime = state.deltaTime;
        b.mouse = state.mouse;
        b.mouseViewport = state.mouseViewport;
        b.intersection = state.intersection;
        b.enterTime = state.enterTime;
        b.leaveTime = state.leaveTime;
        b.uniforms = state.uniforms;
    }

    setSrc(src: EffectTexture): void {
        this.#ctxBacking.src = src;
    }

    setOutput(output: EffectRenderTarget | null): void {
        this.#ctxBacking.output = output;
    }

    // -- internal passthrough pass (used by chain for M=0 / fallback) -------

    /**
     * Draws a passthrough copy of `src` into `target` using the host's
     * own program cache. The viewport passed in is physical-px.
     */
    passthroughCopy(
        src: EffectTexture,
        target: EffectRenderTarget | null,
        viewport: { x: number; y: number; w: number; h: number },
    ): void {
        const prevPhase = this.#phase;
        this.#phase = "render";
        const prevOutput = this.#ctxBacking.output;
        this.#ctxBacking.output = target;
        try {
            const prevVp = this.#dims.outputViewport;
            this.#dims.outputViewport = { ...viewport };
            const glslVersion = this.#ctxBacking.vfxProps.glslVersion;
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
            this.#ctxBacking.output = prevOutput;
            this.#phase = prevPhase;
        }
    }

    /** Clears the given RT with `(0, 0, 0, 0)`. Physical-px target. */
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

    // -- public EffectContext impls (bound via #createContext) --------------

    #createContext(): EffectContext {
        const self = this;
        const b = this.#ctxBacking;
        const quadToken: EffectQuad = EFFECT_QUAD_TOKEN;
        const ctx: EffectContext = {
            get time() {
                return b.time;
            },
            get deltaTime() {
                return b.deltaTime;
            },
            get pixelRatio() {
                return b.pixelRatio;
            },
            get resolution() {
                return b.resolution;
            },
            get mouse() {
                return b.mouse;
            },
            get mouseViewport() {
                return b.mouseViewport;
            },
            get intersection() {
                return b.intersection;
            },
            get enterTime() {
                return b.enterTime;
            },
            get leaveTime() {
                return b.leaveTime;
            },
            get src() {
                return b.src;
            },
            get output() {
                return b.output;
            },
            get uniforms() {
                return b.uniforms;
            },
            get vfxProps() {
                return b.vfxProps;
            },
            quad: quadToken,
            get gl() {
                return self.#gl;
            },
            createRenderTarget: (opts) => self.#createRenderTarget(opts),
            wrapTexture: (source, opts) => self.#wrapTexture(source, opts),
            draw: (opts) => self.#draw(opts),
            onContextRestored: (cb) => {
                const unsub = self.#glCtx.onContextRestored(cb);
                self.#restoredUnsubs.push(unsub);
                return unsub;
            },
        };
        return ctx;
    }

    // -- createRenderTarget -------------------------------------------------

    #createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget {
        const persistent = opts?.persistent ?? false;
        const float = opts?.float ?? false;
        const wrap = normalizeWrap(opts?.wrap);
        const filter = opts?.filter;
        const explicitSize = opts?.size;
        const sizeW = explicitSize
            ? explicitSize[0]
            : this.#dims.elementPhysW;
        const sizeH = explicitSize
            ? explicitSize[1]
            : this.#dims.elementPhysH;

        let resolver: RenderTargetResolver;
        let getW: () => number;
        let getH: () => number;

        if (persistent) {
            const pr = explicitSize ? 1 : this.#pixelRatio;
            const logicalW = explicitSize ? sizeW : sizeW / pr;
            const logicalH = explicitSize ? sizeH : sizeH / pr;
            const bb = new Backbuffer(
                this.#glCtx,
                logicalW,
                logicalH,
                pr,
                float,
                { wrap, filter },
            );
            this.#ownedBackbuffers.push(bb);
            resolver = {
                getReadTexture: () => bb.texture,
                getWriteFbo: () => bb.target,
                swap: () => bb.swap(),
                resize: explicitSize
                    ? undefined
                    : (physW, physH) => {
                          bb.resize(
                              physW / this.#pixelRatio,
                              physH / this.#pixelRatio,
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
            this.#ownedFbs.push(fb);
            resolver = {
                getReadTexture: () => fb.texture,
                getWriteFbo: () => fb,
                resize: explicitSize
                    ? undefined
                    : (physW, physH) => fb.setSize(physW, physH),
                dispose: () => fb.dispose(),
            };
            getW = () => fb.width;
            getH = () => fb.height;
        }

        const handle = Object.create(null) as EffectRenderTargetInternal;
        Object.defineProperties(handle, {
            __brand: { value: "EffectRenderTarget", enumerable: true },
            width: { get: getW, enumerable: true },
            height: { get: getH, enumerable: true },
            [RESOLVE_RT]: { value: resolver },
        });
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

        const handle = Object.create(null) as EffectTextureInternal;
        Object.defineProperties(handle, {
            __brand: { value: "EffectTexture", enumerable: true },
            width: { get: getW, enumerable: true },
            height: { get: getH, enumerable: true },
            [RESOLVE_TEXTURE]: { value: () => texture },
        });
        return handle;
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
            (this.#ctxBacking.vfxProps.glslVersion === "100"
                ? DEFAULT_VERT_100
                : DEFAULT_VERT_300);
        const key = `${opts.frag} ${vert}`;
        let program = this.#programs.get(key);
        if (!program) {
            program = new Program(
                this.#glCtx,
                vert,
                opts.frag,
                this.#ctxBacking.vfxProps.glslVersion,
            );
            this.#programs.set(key, program);
        }

        const ctxOutput = this.#ctxBacking.output;
        const rawTarget =
            opts.target === undefined || opts.target === null
                ? ctxOutput
                : opts.target;
        // Writes to the stage's assigned output (explicit ctx.output, null,
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
        // Auto uniforms: uvInnerRect (dst) + srcInnerRect (src).
        const dst = this.#dims.uvInnerRect;
        out["uvInnerRect"] = {
            value: [dst[0], dst[1], dst[2], dst[3]] as [
                number,
                number,
                number,
                number,
            ],
        };
        const src = this.#dims.srcInnerRect;
        out["srcInnerRect"] = {
            value: [src[0], src[1], src[2], src[3]] as [
                number,
                number,
                number,
                number,
            ],
        };
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
            rt.resolver.dispose();
        }
        this.#ownedRTs = [];
        this.#ownedFbs = [];
        this.#ownedBackbuffers = [];
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
        source instanceof (globalWebGLTexture as unknown as {
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
    if (isEffectRenderTarget(value)) {
        return { value: resolveRt(value).getReadTexture() };
    }
    if (isEffectTexture(value)) {
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
): EffectTexture {
    const handle = Object.create(null) as EffectTextureInternal;
    Object.defineProperties(handle, {
        __brand: { value: "EffectTexture", enumerable: true },
        width: { get: width, enumerable: true },
        height: { get: height, enumerable: true },
        [RESOLVE_TEXTURE]: { value: resolve },
    });
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
        dispose: () => {
            // Chain-owned; host does not dispose via handle.
        },
    };
    const handle = Object.create(null) as EffectRenderTargetInternal;
    Object.defineProperties(handle, {
        __brand: { value: "EffectRenderTarget", enumerable: true },
        width: { get: () => fb.width, enumerable: true },
        height: { get: () => fb.height, enumerable: true },
        [RESOLVE_RT]: { value: resolver },
    });
    return handle;
}

// Re-export resolvers for the chain's internal use.
export { resolveRt, resolveTexture, RESOLVE_RT, RESOLVE_TEXTURE };

/** Effect-host-owned type tag re-export for convenience. @internal */
export type { Effect };
