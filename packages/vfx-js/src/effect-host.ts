import { Backbuffer } from "./backbuffer.js";
import type {
    Backend,
    BackendProgram,
    BackendRenderTarget,
    BackendTargetGroup,
    BackendTexture,
    BlendMode,
    DrawState,
    PendingRead,
    PixelRect,
    TextureWrap,
    Uniform,
    Uniforms,
} from "./backend.js";
import {
    EFFECT_QUAD_TOKEN,
    EffectGeometryCache,
    isEffectQuad,
} from "./effect-geometry.js";
import { detectGlslVersion } from "./glsl-version.js";
import type { ProgramCache } from "./program-cache.js";
import type {
    Effect,
    EffectBlitOpts,
    EffectClearOpts,
    EffectContext,
    EffectDims,
    EffectDrawOpts,
    EffectGeometry,
    EffectReadPixelsOpts,
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
    readonly [RESOLVE_TEXTURE]: () => BackendTexture;
};

/** @internal */
export type EffectRenderTargetInternal = EffectRenderTarget & {
    readonly [RESOLVE_RT]: RenderTargetResolver;
};

/** @internal */
type RenderTargetResolver = {
    /**
     * Current read texture (for sampling the RT as a uniform).
     * May resolve multisampled pixels, which changes framebuffer bindings.
     */
    getReadTexture(): BackendTexture;

    /** Current write target (the draw target). */
    getWriteFbo(): BackendRenderTarget;

    /** Framebuffer behind {@link getReadTexture}: the side last written. */
    getReadFbo(): BackendRenderTarget;

    /** Every framebuffer the RT owns: both sides for `persistent: true`. */
    getFramebuffers?: () => readonly BackendRenderTarget[];

    /** Current read-side depth texture. Present only for RTs with depth. */
    getDepthTexture?: () => BackendTexture;

    /** Called after a draw that wrote to the RT. `persistent: true` only. */
    swap?: () => void;

    /** Called when the host's element size changes (auto-tracking RTs). */
    resize?: (bufferW: number, bufferH: number) => void;
    dispose?: () => void;

    /**
     * Regenerate mips on the current write FB. Present only when the
     * RT was created with `mipmap: true | "manual"`. Always safe to
     * call; no-op for non-mipmap RTs (handled at the FB layer).
     */
    regenerateMipmaps?: () => void;

    /**
     * True iff `mipmap: true` (auto mode). EffectHost calls
     * `regenerateMipmaps` post-draw, pre-swap when set.
     */
    mipmapAutoRegen?: boolean;
};

function resolveTexture(h: EffectTexture): BackendTexture {
    return (h as EffectTextureInternal)[RESOLVE_TEXTURE]();
}

function resolveRt(h: EffectRenderTarget): RenderTargetResolver {
    return (h as EffectRenderTargetInternal)[RESOLVE_RT];
}

function isTargetList(
    target: EffectDrawOpts["target"],
): target is readonly EffectRenderTarget[] {
    return Array.isArray(target);
}

const framebufferIds = new WeakMap<BackendRenderTarget, number>();
let nextFramebufferId = 0;

function framebufferId(framebuffer: BackendRenderTarget): number {
    let id = framebufferIds.get(framebuffer);
    if (id === undefined) {
        id = nextFramebufferId++;
        framebufferIds.set(framebuffer, id);
    }
    return id;
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

// Copy fragment backing `ctx.blit`. Samples `uvSrc` (captured content →
// dst buffer), unlike PASSTHROUGH_FRAG which samples the full dst buffer
// (`uv`) for the stageCount=0 identity copy.
// Outside the src it writes transparent, so a dst larger than the src
// does not repeat the src's edge pixels.
const BLIT_FRAG_300 = `#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`;

const BLIT_FRAG_100 = `
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
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

/** @internal */
type Phase = "init" | "update" | "render" | "disposed";

/** @internal */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** @internal */
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
 * - Managed render target / Backbuffer / texture / geometry entries
 * - Phase flag for `ctx.draw()` suppression in the update phase
 *
 * Compiled programs are not owned here — they live in the
 * VFX-scoped {@link ProgramCache} and are shared across hosts.
 *
 * See plan.md "effect-host.ts" for the full behavior spec.
 * @internal
 */
export class EffectHost {
    #backend: Backend;
    #pixelRatio: number;
    #programCache: ProgramCache;
    #geometries: EffectGeometryCache;
    #ownedTextures: BackendTexture[] = [];
    #ownedRTs: OwnedRT[] = [];
    #autoResizeRTs: OwnedRT[] = [];
    #restoredUnsubs: (() => void)[] = [];
    #pendingReads = new Set<PendingRead>();
    #lostUnsub: (() => void) | null = null;
    #phase: Phase = "init";
    #warnedDrawInUpdate = false;
    #warnedDepthWithoutBuffer = false;
    #warnedInvalidSamples = false;
    #warnedDrawKeys = new Set<string>();
    /** Keyed by the ids of the write framebuffers, in order. */
    #multiFramebuffers = new Map<string, BackendTargetGroup>();
    #dims: HostFrameDims;

    /**
     * Same object as `this.ctx`, typed as mutable for internal frame
     * updates. The chain writes to fields here; user effects see the
     * `readonly` view via `this.ctx`.
     */
    #mutCtx: Mutable<EffectContext>;

    constructor(
        backend: Backend,
        pixelRatio: number,
        initialSrc: EffectTexture,
        initialVfxProps: EffectVFXProps,
        programCache: ProgramCache,
    ) {
        this.#backend = backend;
        this.#pixelRatio = pixelRatio;
        this.#programCache = programCache;
        this.#geometries = new EffectGeometryCache(backend);
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
            enterProgress: 0,
            leaveProgress: 0,
            src: initialSrc,
            target: null,
            uniforms: {},
            vfxProps: initialVfxProps,
            dims: initialDims,
            quad: EFFECT_QUAD_TOKEN,
            // Public API is WebGL-only for now.
            gl: backend.webgl?.gl as WebGL2RenderingContext,
            createRenderTarget: (opts) => this.#createRenderTarget(opts),
            releaseGeometry: (geo) => this.#geometries.release(geo),
            wrapTexture: (source, opts) => this.#wrapTexture(source, opts),
            draw: (opts) => this.#draw(opts),
            blit: (source, target, opts) => this.#blit(source, target, opts),
            clear: (target, opts) => this.#clear(target, opts),
            readPixels: (target, opts) => this.#readPixels(target, opts),
            resetState: () => this.#resetState(),
            onContextRestored: (cb) => {
                const unsub = this.#backend.onRestored(cb);
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
        enterProgress: number;
        leaveProgress: number;
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
        c.enterProgress = state.enterProgress;
        c.leaveProgress = state.leaveProgress;
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
        this.#backend.clear({
            target: resolveRt(rt).getWriteFbo(),
            color: true,
            depth: false,
        });
    }

    // -- createRenderTarget -------------------------------------------------

    #createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget {
        const persistent = opts?.persistent ?? false;
        const float = opts?.float ?? false;
        const wrap = normalizeWrap(opts?.wrap);
        const filter = opts?.filter;
        const mipmapOpt = opts?.mipmap ?? false;
        const mipmap = mipmapOpt !== false;
        const mipmapAutoRegen = mipmapOpt === true;
        const depth = opts?.depth ?? false;
        const samples = this.#resolveSamples(opts?.samples);
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
            const bb = new Backbuffer(this.#backend, cssW, cssH, pr, float, {
                wrap,
                filter,
                mipmap,
                depth,
                samples,
            });
            resolver = {
                getReadTexture: () => {
                    bb.read.resolveColor();
                    return bb.read.texture;
                },
                getWriteFbo: () => bb.target,
                getReadFbo: () => bb.read,
                getFramebuffers: () => bb.framebuffers,
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
            if (mipmap) {
                resolver.regenerateMipmaps = () => bb.target.generateMipmaps();
                resolver.mipmapAutoRegen = mipmapAutoRegen;
            }
            if (depth) {
                // Each side owns a depth texture; return the read side's.
                resolver.getDepthTexture = () => {
                    bb.read.resolveDepth();
                    return bb.read.depthTexture as BackendTexture;
                };
            }
            getW = () => bb.target.width;
            getH = () => bb.target.height;
        } else {
            const fb = this.#backend.createRenderTarget(sizeW, sizeH, {
                float,
                wrap,
                filter,
                mipmap,
                depth,
                samples,
            });
            resolver = {
                getReadTexture: () => {
                    fb.resolveColor();
                    return fb.texture;
                },
                getWriteFbo: () => fb,
                getReadFbo: () => fb,
                getFramebuffers: () => [fb],
                resize: explicitSize
                    ? undefined
                    : (bufferW, bufferH) => fb.setSize(bufferW, bufferH),
                dispose: () => fb.dispose(),
            };
            if (mipmap) {
                resolver.regenerateMipmaps = () => fb.generateMipmaps();
                resolver.mipmapAutoRegen = mipmapAutoRegen;
            }
            const depthTexture = fb.depthTexture;
            if (depthTexture) {
                resolver.getDepthTexture = () => {
                    fb.resolveDepth();
                    return depthTexture;
                };
            }
            getW = () => fb.width;
            getH = () => fb.height;
        }

        let owned: OwnedRT;
        const dispose = () => this.#disposeOwnedRT(owned);
        const handle = makeEffectRenderTarget(resolver, getW, getH, dispose);
        owned = { handle, resolver };
        this.#ownedRTs.push(owned);
        if (!explicitSize) {
            this.#autoResizeRTs.push(owned);
        }
        return handle;
    }

    #resolveSamples(samples: number | undefined): 1 | 4 {
        if (samples === undefined || samples === 1 || samples === 4) {
            return samples ?? 1;
        }
        if (!this.#warnedInvalidSamples) {
            this.#warnedInvalidSamples = true;
            console.warn(
                "[VFX-JS] createRenderTarget() samples must be 1 or 4; using 1.",
            );
        }
        return 1;
    }

    #disposeOwnedRT(owned: OwnedRT): void {
        const idx = this.#ownedRTs.indexOf(owned);
        if (idx < 0) {
            return; // already disposed
        }
        this.#ownedRTs.splice(idx, 1);
        const aIdx = this.#autoResizeRTs.indexOf(owned);
        if (aIdx >= 0) {
            this.#autoResizeRTs.splice(aIdx, 1);
        }
        const framebuffers = owned.resolver.getFramebuffers?.() ?? [];
        for (const [key, multi] of this.#multiFramebuffers) {
            if (multi.members.some((m) => framebuffers.includes(m))) {
                multi.dispose();
                this.#multiFramebuffers.delete(key);
            }
        }
        owned.resolver.dispose?.();
    }

    // -- readPixels ---------------------------------------------------------

    #readPixels(
        target: EffectRenderTarget,
        opts: EffectReadPixelsOpts | undefined,
    ): Promise<Uint8Array | Float32Array> {
        if (this.#phase === "disposed") {
            return Promise.reject(
                new Error(
                    "[VFX-JS] readPixels() was called after the effect was disposed.",
                ),
            );
        }
        if (this.#backend.isLost) {
            return Promise.reject(
                new Error(
                    "[VFX-JS] readPixels() was called while the WebGL context is lost.",
                ),
            );
        }
        // A lost context kills the buffer and the fence: reject what is pending.
        this.#lostUnsub ??= this.#backend.onLost(() =>
            this.#cancelReads(
                "[VFX-JS] readPixels() was cancelled: the WebGL context was lost.",
            ),
        );
        const fb = resolveRt(target).getReadFbo();
        const read = this.#backend.readPixels(fb, opts, (r) =>
            this.#pendingReads.delete(r),
        );
        if (!read.settled) {
            this.#pendingReads.add(read);
        }
        return read.promise;
    }

    #cancelReads(message: string): void {
        const reads = [...this.#pendingReads];
        this.#pendingReads.clear();
        for (const read of reads) {
            read.cancel(new Error(message));
        }
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
        let texture: BackendTexture;
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
            const webgl = this.#backend.webgl;
            if (!webgl) {
                throw new Error(
                    "[VFX-JS] wrapTexture(WebGLTexture) needs the WebGL backend",
                );
            }
            const [sw, sh] = opts.size;
            texture = webgl.wrapTexture(source);
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
            texture = this.#backend.createTexture(domSource);
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

        // Per-handle disposal: drop the texture (and any auto-update hook)
        // from the host's tracking and free its GL storage. Idempotent, so a
        // later host teardown won't double-free it.
        let disposed = false;
        const dispose = () => {
            if (disposed) {
                return;
            }
            disposed = true;
            const ti = this.#ownedTextures.indexOf(texture);
            if (ti !== -1) {
                this.#ownedTextures.splice(ti, 1);
            }
            if (autoUpdateFn) {
                const ai = this.#perFrameAutoUpdate.indexOf(autoUpdateFn);
                if (ai !== -1) {
                    this.#perFrameAutoUpdate.splice(ai, 1);
                }
            }
            texture.dispose();
        };

        // Raw handles hold no source to re-upload from.
        const update = isRawHandle
            ? undefined
            : () => {
                  if (!disposed) {
                      texture.needsUpdate = true;
                  }
              };

        return makeEffectTexture(() => texture, getW, getH, dispose, update);
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

    #blit(
        source: EffectTexture | EffectRenderTarget,
        target: EffectRenderTarget | null | undefined,
        opts: EffectBlitOpts | undefined,
    ): void {
        if (this.#phase !== "render") {
            if (this.#phase === "update" && !this.#warnedDrawInUpdate) {
                this.#warnedDrawInUpdate = true;
                console.warn(
                    "[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().",
                );
            }
            return;
        }
        const frag =
            this.#mutCtx.vfxProps.glslVersion === "100"
                ? BLIT_FRAG_100
                : BLIT_FRAG_300;
        this.#doDraw({
            frag,
            uniforms: { src: source },
            target,
            blend: opts?.blend,
            swap: opts?.swap,
        });
    }

    #clear(
        target: EffectRenderTarget | null | undefined,
        opts: EffectClearOpts | undefined,
    ): void {
        if (this.#phase !== "render") {
            if (this.#phase === "update" && !this.#warnedDrawInUpdate) {
                this.#warnedDrawInUpdate = true;
                console.warn(
                    "[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().",
                );
            }
            return;
        }

        const ctxOutput = this.#mutCtx.target;
        const rawTarget =
            target === undefined || target === null ? ctxOutput : target;
        const isStageOutput = rawTarget === null || rawTarget === ctxOutput;
        const resolver = rawTarget === null ? null : resolveRt(rawTarget);
        const hasDepth = !isStageOutput && !!resolver?.getDepthTexture;
        const color = opts?.color ?? true;
        const depth = (opts?.depth ?? true) && hasDepth;
        if (!color && !depth) {
            return;
        }

        if (isStageOutput || resolver === null) {
            // Stage output (canvas or intermediate RT). Scissor to this
            // stage's viewport so we don't wipe neighbors sharing the FB.
            this.#backend.clear({
                target: resolver === null ? null : resolver.getWriteFbo(),
                color,
                depth,
                scissor: this.#dims.outputViewport,
            });
            return;
        }

        // User RT: clear the whole buffer. Zero both sides of a ping-pong
        // so the next read side is cleared too.
        const clearWrite = () => {
            this.#backend.clear({
                target: resolver.getWriteFbo(),
                color,
                depth,
            });
        };
        clearWrite();
        if (resolver.swap) {
            resolver.swap();
            clearWrite();
            resolver.swap();
        }
    }

    /** See `EffectContext.resetState`. No-op off WebGL. */
    #resetState(): void {
        if (this.#phase === "disposed" || this.#backend.isLost) {
            return;
        }
        this.#backend.webgl?.resetState();
    }

    #warnOnce(key: string, message: string): void {
        if (this.#warnedDrawKeys.has(key)) {
            return;
        }
        this.#warnedDrawKeys.add(key);
        console.warn(message);
    }

    #getProgram(opts: EffectDrawOpts): BackendProgram {
        const vert =
            opts.vert ??
            (this.#mutCtx.vfxProps.glslVersion === "100"
                ? DEFAULT_VERT_100
                : DEFAULT_VERT_300);
        return this.#programCache.get(
            vert,
            opts.frag,
            this.#mutCtx.vfxProps.glslVersion,
        );
    }

    #doDraw(opts: EffectDrawOpts): void {
        const target = opts.target;
        if (!isTargetList(target)) {
            this.#drawToTarget(opts, target);
        } else if (target.length === 1 && target[0]) {
            this.#drawToTarget(opts, target[0]);
        } else {
            this.#drawToTargets(opts, target);
        }
    }

    #drawToTarget(
        opts: EffectDrawOpts,
        target: EffectRenderTarget | null | undefined,
    ): void {
        const program = this.#getProgram(opts);

        const ctxOutput = this.#mutCtx.target;
        const rawTarget =
            target === undefined || target === null ? ctxOutput : target;
        // Writes to the stage's assigned target (explicit ctx.target, null,
        // or omitted) honor the chain-computed outputViewport. Writes to a
        // user-allocated RT get full-RT dims.
        const isStageOutput = rawTarget === null || rawTarget === ctxOutput;

        // Sampling a multisampled RT resolves it, which rebinds framebuffers.
        // So build uniforms before binding the draw target.
        const uniforms = this.#buildUniforms(opts.uniforms);

        let writeFb: BackendRenderTarget | null = null;
        let vpX: number;
        let vpY: number;
        let vpW: number;
        let vpH: number;
        let swap: (() => void) | undefined;
        let regenerateMipmaps: (() => void) | undefined;
        let hasDepth = false;
        if (rawTarget === null) {
            vpX = this.#dims.outputViewport.x;
            vpY = this.#dims.outputViewport.y;
            vpW = this.#dims.outputViewport.w;
            vpH = this.#dims.outputViewport.h;
        } else {
            const resolver = resolveRt(rawTarget);
            writeFb = resolver.getWriteFbo();
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
            hasDepth = !isStageOutput && !!resolver.getDepthTexture;
            if (resolver.mipmapAutoRegen) {
                regenerateMipmaps = resolver.regenerateMipmaps;
            }
        }

        const blend =
            opts.blend ?? (rawTarget === null ? "premultiplied" : "none");
        this.#submitDraw(
            opts,
            program,
            uniforms,
            writeFb,
            { x: vpX, y: vpY, w: vpW, h: vpH },
            blend,
            hasDepth,
        );

        // Regen pre-swap: getWriteFbo() returned the buffer we just
        // drew to. After swap, that buffer rotates to the read side
        // and the next draw would land on the stale partner.
        regenerateMipmaps?.();
        if (swap && opts.swap !== false) {
            swap();
        }
    }

    #drawToTargets(
        opts: EffectDrawOpts,
        targets: readonly EffectRenderTarget[],
    ): void {
        const resolvers = this.#validateTargets(targets);
        if (!resolvers) {
            return;
        }
        const program = this.#getProgram(opts);
        const glslVersion =
            this.#mutCtx.vfxProps.glslVersion ?? detectGlslVersion(opts.frag);
        if (glslVersion === "100") {
            this.#warnOnce(
                "glsl100",
                "[VFX-JS] ctx.draw() with several targets needs a GLSL 300 es shader; draw skipped.",
            );
            return;
        }

        // Sampling a multisampled RT resolves it, which rebinds framebuffers.
        // So build uniforms before binding the draw target.
        const uniforms = this.#buildUniforms(opts.uniforms);

        const members = resolvers.map((r) => r.getWriteFbo());
        const depthIndices = resolvers.flatMap((r, i) =>
            r.getDepthTexture ? [i] : [],
        );
        // Only a draw that uses depth leaves the other depth buffers stale.
        const depthTest = opts.depthTest ?? false;
        const usesDepth = depthTest || (opts.depthWrite ?? depthTest);
        if (depthIndices.length > 1 && usesDepth) {
            this.#warnOnce(
                "depths",
                "[VFX-JS] ctx.draw() got several targets with depth; using the first one's depth.",
            );
        }
        const depthSource =
            depthIndices.length > 0 ? members[depthIndices[0]] : null;
        const multi = this.#getMultiFramebuffer(members, depthSource);

        this.#submitDraw(
            opts,
            program,
            uniforms,
            multi,
            { x: 0, y: 0, w: multi.width, h: multi.height },
            opts.blend ?? "none",
            depthSource !== null,
        );

        // Regen pre-swap, as in the single-target path.
        for (const resolver of resolvers) {
            if (resolver.mipmapAutoRegen) {
                resolver.regenerateMipmaps?.();
            }
        }
        if (opts.swap !== false) {
            for (const resolver of resolvers) {
                resolver.swap?.();
            }
        }
    }

    /** Resolvers for a valid target list, or null after a warning. */
    #validateTargets(
        targets: readonly EffectRenderTarget[],
    ): RenderTargetResolver[] | null {
        if (targets.length === 0) {
            this.#warnOnce(
                "empty",
                "[VFX-JS] ctx.draw() got an empty target array; draw skipped.",
            );
            return null;
        }
        if (targets.some((target) => !target)) {
            this.#warnOnce(
                "null",
                "[VFX-JS] ctx.draw() target array can't contain null; draw skipped.",
            );
            return null;
        }
        const ctxOutput = this.#mutCtx.target;
        if (ctxOutput && targets.includes(ctxOutput)) {
            this.#warnOnce(
                "stageOutput",
                "[VFX-JS] ctx.draw() target array can't contain ctx.target; draw skipped.",
            );
            return null;
        }
        if (new Set(targets).size !== targets.length) {
            this.#warnOnce(
                "duplicate",
                "[VFX-JS] ctx.draw() target array has the same target twice; draw skipped.",
            );
            return null;
        }
        const resolvers = targets.map(resolveRt);
        const framebuffers = resolvers.map((r) => r.getWriteFbo());
        const first = framebuffers[0];
        if (
            framebuffers.some(
                (fb) => fb.width !== first.width || fb.height !== first.height,
            )
        ) {
            this.#warnOnce(
                "size",
                "[VFX-JS] ctx.draw() targets in an array must have the same size; draw skipped.",
            );
            return null;
        }
        if (framebuffers.some((fb) => fb.samples !== first.samples)) {
            this.#warnOnce(
                "samples",
                "[VFX-JS] ctx.draw() targets in an array must have the same samples; draw skipped.",
            );
            return null;
        }
        const maxDrawBuffers = this.#backend.maxDrawTargets;
        if (targets.length > maxDrawBuffers) {
            this.#warnOnce(
                "count",
                `[VFX-JS] ctx.draw() got ${targets.length} targets, but this GPU takes at most ${maxDrawBuffers}; draw skipped.`,
            );
            return null;
        }
        return resolvers;
    }

    #getMultiFramebuffer(
        members: readonly BackendRenderTarget[],
        depthSource: BackendRenderTarget | null,
    ): BackendTargetGroup {
        const key = members.map((m) => framebufferId(m)).join(",");
        let multi = this.#multiFramebuffers.get(key);
        if (!multi) {
            multi = this.#backend.createTargetGroup(members, depthSource);
            this.#multiFramebuffers.set(key, multi);
        }
        return multi;
    }

    /** Draw the geometry with its depth and cull state. */
    #submitDraw(
        opts: EffectDrawOpts,
        program: BackendProgram,
        uniforms: Uniforms,
        target: BackendRenderTarget | BackendTargetGroup | null,
        viewport: PixelRect,
        blend: BlendMode,
        hasDepth: boolean,
    ): void {
        const drawState = this.#resolveDrawState(opts, hasDepth);
        const geometry = opts.geometry ?? EFFECT_QUAD_TOKEN;
        const compiled = isEffectQuad(geometry)
            ? this.#geometries.quad
            : this.#geometries.resolve(geometry as EffectGeometry, program);
        this.#backend.draw({
            program,
            uniforms,
            target,
            viewport,
            blend,
            drawState,
            geometry: compiled,
        });
    }

    /** Depth and cull state for a draw, or null when it needs none. */
    #resolveDrawState(
        opts: EffectDrawOpts,
        hasDepth: boolean,
    ): DrawState | null {
        let depthTest = opts.depthTest ?? false;
        let depthWrite = opts.depthWrite ?? depthTest;
        const cull = opts.cull ?? "none";
        if ((depthTest || depthWrite) && !hasDepth) {
            if (!this.#warnedDepthWithoutBuffer) {
                this.#warnedDepthWithoutBuffer = true;
                console.warn(
                    "[VFX-JS] ctx.draw() depthTest / depthWrite needs a target created with depth: true; ignored.",
                );
            }
            depthTest = false;
            depthWrite = false;
        }
        if (!depthTest && !depthWrite && cull === "none") {
            return null;
        }
        return {
            depthTest,
            depthWrite,
            depthFunc: opts.depthFunc ?? "lequal",
            cull,
        };
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
            out[name] = toInternalUniform(value, this.#backend);
        }
        return out;
    }

    // -- dispose ------------------------------------------------------------

    dispose(): void {
        this.#phase = "disposed";
        this.#cancelReads(
            "[VFX-JS] readPixels() was cancelled: the effect was disposed.",
        );
        this.#lostUnsub?.();
        this.#lostUnsub = null;
        for (const unsub of this.#restoredUnsubs) {
            unsub();
        }
        this.#restoredUnsubs = [];
        for (const multi of this.#multiFramebuffers.values()) {
            multi.dispose();
        }
        this.#multiFramebuffers.clear();
        for (const rt of this.#ownedRTs) {
            rt.resolver.dispose?.();
        }
        this.#ownedRTs = [];
        this.#autoResizeRTs = [];
        for (const t of this.#ownedTextures) {
            t.dispose();
        }
        this.#ownedTextures = [];
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

function toInternalUniform(
    value: EffectUniformValue,
    backend: Backend,
): Uniform {
    if (typeof value === "object" && value !== null && "__brand" in value) {
        if (value.__brand === "EffectRenderTarget") {
            return { value: resolveRt(value).getReadTexture() };
        }
        const texture = resolveTexture(value);
        if (texture && !backend.ownsTexture(texture)) {
            throw new Error(
                "[VFX-JS] This texture belongs to another VFX instance.",
            );
        }
        return { value: texture };
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
    resolve: () => BackendTexture,
    width: () => number,
    height: () => number,
    dispose?: () => void,
    update?: () => void,
): EffectTextureInternal {
    const handle = {
        __brand: "EffectTexture",
        get width() {
            return width();
        },
        get height() {
            return height();
        },
        // Framework-owned handles pass no disposer and ignore the call.
        dispose() {
            dispose?.();
        },
        update() {
            update?.();
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
    dispose?: () => void,
): EffectRenderTargetInternal {
    const handle = {
        __brand: "EffectRenderTarget",
        get width() {
            return width();
        },
        get height() {
            return height();
        },
        // Framework-owned RTs pass no dispose; the no-op makes
        // `rt.dispose()` always safe to call.
        dispose: dispose ?? (() => {}),
        // No-op when the underlying RT has no mip storage.
        generateMipmaps: () => resolver.regenerateMipmaps?.(),
    } as Mutable<EffectRenderTargetInternal>;
    // Follows swaps. The RT owns the texture, so its dispose is a no-op.
    if (resolver.getDepthTexture) {
        handle.depthTexture = makeEffectTexture(
            resolver.getDepthTexture,
            width,
            height,
        );
    }
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
    fb: BackendRenderTarget,
): EffectRenderTarget {
    const resolver: RenderTargetResolver = {
        getReadTexture: () => fb.texture,
        getWriteFbo: () => fb,
        getReadFbo: () => fb,
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
