import type { GlslVersion } from "./glsl-version.js";
import type { EffectGeometry, EffectTexture } from "./types.js";
import type { Vec2, Vec4 } from "./vec.js";

/*
 * Internal GPU backend interface. The renderer talks only to this;
 * `gl/` holds the WebGL2 implementation.
 * Draws and clears take all their state, so nothing leaks between calls.
 */

/** @internal */
export type TextureWrap = "clamp" | "repeat" | "mirror";

/** @internal */
export type TextureFilter = "nearest" | "linear";

/** @internal */
export type TextureSource =
    | HTMLImageElement
    | HTMLVideoElement
    | HTMLCanvasElement
    | OffscreenCanvas
    | ImageBitmap;

/**
 * Blending preset for a draw.
 *   - `"normal"`: non-premultiplied (SRC_ALPHA, ONE_MINUS_SRC_ALPHA).
 *   - `"premultiplied"`: premultiplied (ONE, ONE_MINUS_SRC_ALPHA).
 *   - `"additive"`: premultiplied additive (ONE, ONE). Source RGB and
 *     alpha both accumulate onto the destination.
 *   - `"none"`: no blending. The output replaces the destination.
 * @internal
 */
export type BlendMode = "normal" | "premultiplied" | "additive" | "none";

/** @internal */
export type DepthFunc =
    | "never"
    | "less"
    | "equal"
    | "lequal"
    | "greater"
    | "notequal"
    | "gequal"
    | "always";

/** @internal */
export type CullMode = "none" | "back" | "front";

/** Per-draw depth and cull state. @internal */
export type DrawState = {
    depthTest: boolean;
    depthWrite: boolean;
    depthFunc: DepthFunc;
    cull: CullMode;
};

/** @internal */
export type UniformValue =
    | number
    | boolean
    | Vec2
    | Vec4
    | BackendTexture
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | number[]
    | Float32Array
    | Int32Array
    | Uint32Array
    // Effect-path handle. Effects resolve it; the shader path skips it.
    | EffectTexture;

/** @internal */
export type Uniform = { value: UniformValue | null };

/** @internal */
export type Uniforms = { [name: string]: Uniform };

/** Device-px rect, bottom-left origin. @internal */
export type PixelRect = { x: number; y: number; w: number; h: number };

/**
 * Shader code in one shading language.
 * A backend throws on a language it can't run.
 * @internal
 */
export type ShaderSource = {
    readonly language: "glsl";
    readonly vert: string;
    readonly frag: string;
    /** Auto-detected from `frag` when omitted. */
    readonly glslVersion?: GlslVersion;
};

/** @internal */
export interface BackendTexture {
    /** Source image/canvas/video; exposed for identity comparison. */
    source: TextureSource | null;
    wrapS: TextureWrap;
    wrapT: TextureWrap;
    minFilter: TextureFilter;
    magFilter: TextureFilter;

    /** Premultiply alpha on upload. */
    premultiplyAlpha: boolean;

    /** Upload from `source` again before the next draw that samples it. */
    needsUpdate: boolean;
    dispose(): void;
}

/** @internal */
export type RenderTargetOpts = {
    float?: boolean;
    wrap?: TextureWrap | readonly [TextureWrap, TextureWrap];
    filter?: TextureFilter;
    mipmap?: boolean;
    depth?: boolean;
    samples?: 1 | 4;
};

/** @internal */
export interface BackendRenderTarget {
    readonly width: number;
    readonly height: number;

    /** Actual sample count. 1 when the GPU can't do the requested 4. */
    readonly samples: 1 | 4;
    readonly texture: BackendTexture;
    readonly depthTexture: BackendTexture | null;
    setSize(width: number, height: number): void;

    /** Make {@link texture} hold the latest draws. Call before sampling it. */
    resolveColor(): void;

    /** Make {@link depthTexture} hold the latest draws. Call before sampling it. */
    resolveDepth(): void;

    /** Regenerate mips from level 0. No-op without `mipmap: true`. */
    generateMipmaps(): void;
    dispose(): void;
}

/**
 * Several render targets drawn in one draw.
 * Members stay owned by the caller.
 * @internal
 */
export interface BackendTargetGroup {
    readonly members: readonly BackendRenderTarget[];
    readonly width: number;
    readonly height: number;
    dispose(): void;
}

/** Compiled shader program. @internal */
export interface BackendProgram {
    dispose(): void;
}

/** Vertex data built for one program. @internal */
export interface BackendGeometry {
    dispose(): void;
}

/** @internal */
export type DrawCommand = {
    program: BackendProgram;
    uniforms: Uniforms;

    /** Null draws to the canvas. */
    target: BackendRenderTarget | BackendTargetGroup | null;
    viewport: PixelRect;
    blend: BlendMode;

    /** Depth and cull state. Omit for none. */
    drawState?: DrawState | null;

    /** Defaults to {@link Backend.quad}. */
    geometry?: BackendGeometry;
};

/** @internal */
export type ClearCommand = {
    /** Null clears the canvas. */
    target: BackendRenderTarget | null;
    color: boolean;
    depth: boolean;

    /** Clear only this rect. Omit to clear the whole target. */
    scissor?: PixelRect;
};

/** @internal */
export type PixelReadOpts = {
    flipY?: boolean;
};

/** An async readback in flight. @internal */
export interface PendingRead {
    readonly promise: Promise<Uint8Array | Float32Array>;

    /** True once the promise resolved or rejected. */
    readonly settled: boolean;

    /** Reject the read and free its resources. No-op once settled. */
    cancel(err: Error): void;
}

/**
 * Raw WebGL access, only on the WebGL backend.
 * Backs public APIs that expose WebGL (`ctx.gl`, `WebGLTexture` sources).
 * @internal
 */
export interface WebGLAccess {
    readonly gl: WebGL2RenderingContext;

    /** Wrap a caller-owned texture. The caller keeps ownership. */
    wrapTexture(handle: WebGLTexture): BackendTexture;

    /** Write the GL state baseline the renderer assumes. */
    resetState(): void;
}

/**
 * GPU backend for one canvas.
 * Resources survive a lost device: the backend rebuilds them on restore.
 * @internal
 */
export interface Backend {
    readonly maxTextureSize: number;

    /** Max render targets in one draw. */
    readonly maxDrawTargets: number;

    /** True between a device loss and its restore. */
    readonly isLost: boolean;

    /** Undefined on non-WebGL backends. */
    readonly webgl: WebGLAccess | undefined;

    /** The fullscreen quad (NDC -1..1). */
    readonly quad: BackendGeometry;

    /** Resize the canvas drawing buffer. */
    setSize(width: number, height: number, pixelRatio: number): void;

    /** Returns an unsubscribe function. */
    onLost(cb: () => void): () => void;

    /** Called after resources are rebuilt. Returns an unsubscribe function. */
    onRestored(cb: () => void): () => void;

    /** Without a source, the texture samples as transparent 1x1. */
    createTexture(source?: TextureSource): BackendTexture;

    /** Upload now. Throws when the upload throws. */
    uploadTexture(texture: BackendTexture): void;

    /** Whether `texture` was made by this backend. */
    ownsTexture(texture: BackendTexture): boolean;
    createRenderTarget(
        width: number,
        height: number,
        opts?: RenderTargetOpts,
    ): BackendRenderTarget;

    /** `depthSource` supplies the group's depth buffer. */
    createTargetGroup(
        members: readonly BackendRenderTarget[],
        depthSource: BackendRenderTarget | null,
    ): BackendTargetGroup;
    createProgram(source: ShaderSource): BackendProgram;
    createGeometry(
        geometry: EffectGeometry,
        program: BackendProgram,
    ): BackendGeometry;
    draw(command: DrawCommand): void;
    clear(command: ClearCommand): void;

    /** Read a target's color. `onSettle` runs when the read settles. */
    readPixels(
        target: BackendRenderTarget,
        opts: PixelReadOpts | undefined,
        onSettle: (read: PendingRead) => void,
    ): PendingRead;
    dispose(): void;
}
