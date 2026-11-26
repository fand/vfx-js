import type {
    Backend,
    BackendGeometry,
    BackendProgram,
    BackendRenderTarget,
    BackendTargetGroup,
    BackendTexture,
    BlendMode,
    ClearCommand,
    DrawCommand,
    PendingRead,
    RenderTargetOpts,
    ShaderSource,
    TextureFilter,
    TextureSource,
    TextureWrap,
} from "../backend.js";
import { WGSL_PRESENT, WGSL_VERTEX } from "./shaders.js";
import {
    packUniforms,
    reflectWgsl,
    samplerTextureName,
    type WgslBindings,
} from "./wgsl.js";

// WebGPU flag values. TypeScript's DOM lib types the API but not these globals.
const TextureUsage = {
    COPY_SRC: 0x01,
    COPY_DST: 0x02,
    TEXTURE_BINDING: 0x04,
    RENDER_ATTACHMENT: 0x10,
} as const;
const BufferUsage = { COPY_DST: 0x08, UNIFORM: 0x40 } as const;
const FRAGMENT_STAGE = 0x2;

const SCREEN_FORMAT: GPUTextureFormat = "rgba8unorm";
const FLOAT_FORMAT: GPUTextureFormat = "rgba16float";

// Uniforms the player always passes; a shader may leave them out.
const BUILTIN_UNIFORMS = new Set([
    "src",
    "resolution",
    "offset",
    "viewport",
    "time",
    "mouse",
    "enterTime",
    "leaveTime",
    "enterProgress",
    "leaveProgress",
    "intersection",
    "autoCrop",
    "backbuffer",
    "passIndex",
]);

function unsupported(feature: string): Error {
    return new Error(
        `[VFX-JS] ${feature} is not supported on the WebGPU backend yet.`,
    );
}

function sourceSize(src: TextureSource): [number, number] {
    if (
        typeof HTMLImageElement !== "undefined" &&
        src instanceof HTMLImageElement
    ) {
        return [src.naturalWidth, src.naturalHeight];
    }
    if (
        typeof HTMLVideoElement !== "undefined" &&
        src instanceof HTMLVideoElement
    ) {
        return [src.videoWidth, src.videoHeight];
    }
    return [src.width, src.height];
}

function addressMode(wrap: TextureWrap): GPUAddressMode {
    if (wrap === "repeat") {
        return "repeat";
    }
    if (wrap === "mirror") {
        return "mirror-repeat";
    }
    return "clamp-to-edge";
}

function blendState(mode: BlendMode): GPUBlendState | undefined {
    const add = (
        srcFactor: GPUBlendFactor,
        dstFactor: GPUBlendFactor,
    ): GPUBlendComponent => ({ operation: "add", srcFactor, dstFactor });
    switch (mode) {
        case "none":
            return undefined;
        case "premultiplied":
            return {
                color: add("one", "one-minus-src-alpha"),
                alpha: add("one", "one-minus-src-alpha"),
            };
        case "additive":
            return { color: add("one", "one"), alpha: add("one", "one") };
        case "normal":
            return {
                color: add("src-alpha", "one-minus-src-alpha"),
                alpha: add("one", "one-minus-src-alpha"),
            };
    }
}

/** @internal */
class GPUTextureHandle implements BackendTexture {
    source: TextureSource | null;
    wrapS: TextureWrap = "clamp";
    wrapT: TextureWrap = "clamp";
    minFilter: TextureFilter = "linear";
    magFilter: TextureFilter = "linear";
    premultiplyAlpha = false;
    needsUpdate = true;

    readonly backend: WebGPUBackend;

    /** Null for a render target's color texture, whose storage it owns. */
    gpu: GPUTexture | null = null;
    view: GPUTextureView | null = null;
    width = 0;
    height = 0;

    constructor(backend: WebGPUBackend, source: TextureSource | null) {
        this.backend = backend;
        this.source = source;
    }

    dispose(): void {
        this.backend.releaseTexture(this);
    }
}

/** @internal */
class GPURenderTargetHandle implements BackendRenderTarget {
    width: number;
    height: number;
    readonly samples = 1;
    readonly float: boolean;
    readonly format: GPUTextureFormat;
    readonly texture: GPUTextureHandle;
    readonly depthTexture = null;
    readonly #backend: WebGPUBackend;

    constructor(
        backend: WebGPUBackend,
        width: number,
        height: number,
        float: boolean,
    ) {
        this.#backend = backend;
        this.width = Math.max(1, Math.floor(width));
        this.height = Math.max(1, Math.floor(height));
        this.float = float;
        this.format = float ? FLOAT_FORMAT : SCREEN_FORMAT;
        this.texture = new GPUTextureHandle(backend, null);
        this.texture.needsUpdate = false;
    }

    setSize(width: number, height: number): void {
        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        if (w === this.width && h === this.height) {
            return;
        }
        this.width = w;
        this.height = h;
        this.#backend.allocateTarget(this);
    }

    // Single-sampled, no mips: nothing to resolve.
    resolveColor(): void {}

    resolveDepth(): void {}

    generateMipmaps(): void {}

    dispose(): void {
        this.#backend.releaseTarget(this);
    }
}

type PipelineState = { pipeline: GPURenderPipeline | null; failed: boolean };

/** Compiled user shader, shared by every program with the same code. */
type ShaderEntry = {
    code: string;
    bindings: WgslBindings;
    module: GPUShaderModule;
    pipelineLayout: GPUPipelineLayout;
    bindGroupLayout: GPUBindGroupLayout;
    pipelines: Map<string, PipelineState>;
    warned: Set<string>;
};

/** @internal */
class GPUProgramHandle implements BackendProgram {
    readonly entry: ShaderEntry;

    constructor(entry: ShaderEntry) {
        this.entry = entry;
    }

    // Shader entries are cached by code for the life of the backend.
    dispose(): void {}
}

type Device = {
    adapter: GPUAdapter;
    device: GPUDevice;
    vertexModule: GPUShaderModule;
    present: GPURenderPipeline;
};

async function requestDevice(context: GPUCanvasContext): Promise<Device> {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("[VFX-JS] WebGPU found no GPU adapter.");
    }
    const device = await adapter.requestDevice();
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
    });
    const presentModule = device.createShaderModule({ code: WGSL_PRESENT });
    const present = await device.createRenderPipelineAsync({
        layout: "auto",
        vertex: { module: presentModule, entryPoint: "vs" },
        fragment: {
            module: presentModule,
            entryPoint: "fs",
            targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
        },
    });
    const vertexModule = device.createShaderModule({ code: WGSL_VERTEX });
    return { adapter, device, vertexModule, present };
}

/**
 * Create a WebGPU backend on `canvas`.
 * Rejects when WebGPU or a GPU device is not available.
 * @internal
 */
export async function createWebGPUBackend(
    canvas: HTMLCanvasElement,
): Promise<WebGPUBackend> {
    if (typeof navigator === "undefined" || !navigator.gpu) {
        throw new Error("[VFX-JS] WebGPU is not available in this browser.");
    }
    const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
    if (!context) {
        throw new Error("[VFX-JS] Failed to get a WebGPU canvas context.");
    }
    return new WebGPUBackend(canvas, context, await requestDevice(context));
}

/**
 * {@link Backend} over WebGPU. Experimental.
 *
 * Every target, the screen included, stores rows bottom-up like WebGL,
 * so viewports and `@builtin(position)` use WebGL's numbers.
 * `endFrame` flips the screen target onto the canvas.
 * @internal
 */
export class WebGPUBackend implements Backend {
    readonly shaderLanguage = "wgsl";
    readonly webgl = undefined;

    #canvas: HTMLCanvasElement;
    #context: GPUCanvasContext;
    #gpu: Device;
    #isLost = false;
    #disposed = false;
    #onLost = new Set<() => void>();
    #onRestored = new Set<() => void>();

    #textures = new Set<GPUTextureHandle>();
    #targets = new Set<GPURenderTargetHandle>();
    #shaders = new Map<string, ShaderEntry>();
    #samplers = new Map<string, GPUSampler>();
    #uniformBuffers = new Map<number, { buffers: GPUBuffer[]; used: number }>();
    #emptyTexture: GPUTextureHandle;
    #screen: GPURenderTargetHandle;
    #encoder: GPUCommandEncoder | null = null;

    // Freed after the frame that may still use them is submitted.
    #garbage: GPUTexture[] = [];

    constructor(
        canvas: HTMLCanvasElement,
        context: GPUCanvasContext,
        gpu: Device,
    ) {
        this.#canvas = canvas;
        this.#context = context;
        this.#gpu = gpu;
        this.#emptyTexture = this.createTexture() as GPUTextureHandle;
        this.#screen = new GPURenderTargetHandle(
            this,
            canvas.width,
            canvas.height,
            false,
        );
        this.#targets.add(this.#screen);
        this.allocateTarget(this.#screen);
        this.#watchLoss();
    }

    get maxTextureSize(): number {
        return this.#gpu.device.limits.maxTextureDimension2D;
    }

    get maxDrawTargets(): number {
        return this.#gpu.device.limits.maxColorAttachments;
    }

    get isLost(): boolean {
        return this.#isLost;
    }

    get quad(): BackendGeometry {
        throw unsupported("Custom geometry");
    }

    setSize(width: number, height: number, pixelRatio: number): void {
        const w = Math.floor(width * pixelRatio);
        const h = Math.floor(height * pixelRatio);
        if (this.#canvas.width !== w || this.#canvas.height !== h) {
            this.#canvas.width = w;
            this.#canvas.height = h;
        }
    }

    onLost(cb: () => void): () => void {
        this.#onLost.add(cb);
        return () => this.#onLost.delete(cb);
    }

    onRestored(cb: () => void): () => void {
        this.#onRestored.add(cb);
        return () => this.#onRestored.delete(cb);
    }

    createTexture(source?: TextureSource): BackendTexture {
        const texture = new GPUTextureHandle(this, source ?? null);
        this.#textures.add(texture);
        this.#allocateTexture(texture, 1, 1);
        if (!source) {
            texture.needsUpdate = false;
        }
        return texture;
    }

    uploadTexture(texture: BackendTexture): void {
        this.#upload(texture as GPUTextureHandle, true);
    }

    ownsTexture(texture: BackendTexture): boolean {
        return texture instanceof GPUTextureHandle && texture.backend === this;
    }

    createRenderTarget(
        width: number,
        height: number,
        opts: RenderTargetOpts = {},
    ): BackendRenderTarget {
        if (opts.depth || opts.mipmap || opts.samples === 4) {
            throw unsupported("Depth, mipmaps and MSAA on render targets");
        }
        const target = new GPURenderTargetHandle(
            this,
            width,
            height,
            opts.float ?? false,
        );
        const wrap = opts.wrap;
        if (wrap !== undefined) {
            target.texture.wrapS = typeof wrap === "string" ? wrap : wrap[0];
            target.texture.wrapT = typeof wrap === "string" ? wrap : wrap[1];
        }
        if (opts.filter !== undefined) {
            target.texture.minFilter = opts.filter;
            target.texture.magFilter = opts.filter;
        }
        this.#targets.add(target);
        this.allocateTarget(target);
        return target;
    }

    createTargetGroup(): BackendTargetGroup {
        throw unsupported("Drawing to several targets");
    }

    createProgram(source: ShaderSource): BackendProgram {
        if (source.language !== "wgsl") {
            throw new Error(
                "[VFX-JS] The WebGPU backend runs WGSL only. Pass the shader as `wgsl`.",
            );
        }
        let entry = this.#shaders.get(source.frag);
        if (!entry) {
            entry = this.#createShader(source.frag);
            this.#shaders.set(source.frag, entry);
        }
        return new GPUProgramHandle(entry);
    }

    prepare(
        program: BackendProgram,
        blend: BlendMode,
        float: boolean,
    ): boolean {
        const { entry } = program as GPUProgramHandle;
        const format = float ? FLOAT_FORMAT : SCREEN_FORMAT;
        return this.#pipeline(entry, blend, format).pipeline !== null;
    }

    createGeometry(): BackendGeometry {
        throw unsupported("Custom geometry");
    }

    beginFrame(): void {
        for (const pool of this.#uniformBuffers.values()) {
            pool.used = 0;
        }
        this.#screen.setSize(this.#canvas.width, this.#canvas.height);
    }

    endFrame(): void {
        const encoder = this.#encoder;
        if (!encoder || this.#isLost) {
            this.#encoder = null;
            return;
        }
        const { device, present } = this.#gpu;
        const screenView = this.#screen.texture.view;
        if (screenView) {
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.#context.getCurrentTexture().createView(),
                        loadOp: "clear",
                        clearValue: { r: 0, g: 0, b: 0, a: 0 },
                        storeOp: "store",
                    },
                ],
            });
            pass.setPipeline(present);
            pass.setBindGroup(
                0,
                device.createBindGroup({
                    layout: present.getBindGroupLayout(0),
                    entries: [{ binding: 0, resource: screenView }],
                }),
            );
            pass.draw(3);
            pass.end();
        }
        device.queue.submit([encoder.finish()]);
        this.#encoder = null;
        for (const texture of this.#garbage) {
            texture.destroy();
        }
        this.#garbage = [];
    }

    draw(command: DrawCommand): void {
        if (this.#isLost) {
            return;
        }
        if (command.geometry || command.drawState) {
            throw unsupported("Custom geometry and depth state");
        }
        const target = command.target;
        if (target !== null && !(target instanceof GPURenderTargetHandle)) {
            throw unsupported("Drawing to several targets");
        }
        const rt = target ?? this.#screen;
        const entry = (command.program as GPUProgramHandle).entry;
        const pipeline = this.#pipeline(
            entry,
            command.blend,
            rt.format,
        ).pipeline;
        const view = rt.texture.view;
        if (!pipeline || !view) {
            return;
        }

        // A WebGPU viewport must stay inside the target.
        const vp = command.viewport;
        const x0 = Math.max(0, vp.x);
        const y0 = Math.max(0, vp.y);
        const x1 = Math.min(rt.width, vp.x + vp.w);
        const y1 = Math.min(rt.height, vp.y + vp.h);
        if (x1 <= x0 || y1 <= y0) {
            return;
        }

        const bindGroup = this.#bindGroup(entry, command, rt);
        const pass = this.#getEncoder().beginRenderPass({
            colorAttachments: [{ view, loadOp: "load", storeOp: "store" }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setViewport(x0, y0, x1 - x0, y1 - y0, 0, 1);
        pass.draw(6);
        pass.end();
    }

    clear(command: ClearCommand): void {
        if (this.#isLost || !command.color) {
            return;
        }
        if (command.scissor) {
            throw unsupported("Clearing part of a target");
        }
        const rt =
            (command.target as GPURenderTargetHandle | null) ?? this.#screen;
        const view = rt.texture.view;
        if (!view) {
            return;
        }
        this.#getEncoder()
            .beginRenderPass({
                colorAttachments: [
                    {
                        view,
                        loadOp: "clear",
                        clearValue: { r: 0, g: 0, b: 0, a: 0 },
                        storeOp: "store",
                    },
                ],
            })
            .end();
    }

    readPixels(): PendingRead {
        throw unsupported("readPixels()");
    }

    dispose(): void {
        this.#disposed = true;
        this.#encoder = null;
        this.#context.unconfigure();
        this.#gpu.device.destroy();
    }

    /** (Re)create a target's storage at its current size. @internal */
    allocateTarget(target: GPURenderTargetHandle): void {
        this.#retire(target.texture.gpu);
        const gpu = this.#gpu.device.createTexture({
            size: [target.width, target.height],
            format: target.format,
            usage:
                TextureUsage.RENDER_ATTACHMENT |
                TextureUsage.TEXTURE_BINDING |
                TextureUsage.COPY_SRC,
        });
        target.texture.gpu = gpu;
        target.texture.view = gpu.createView();
        target.texture.width = target.width;
        target.texture.height = target.height;
    }

    /** @internal */
    releaseTarget(target: GPURenderTargetHandle): void {
        this.#targets.delete(target);
        this.#retire(target.texture.gpu);
        target.texture.gpu = null;
        target.texture.view = null;
    }

    /** @internal */
    releaseTexture(texture: GPUTextureHandle): void {
        if (!this.#textures.delete(texture)) {
            return;
        }
        this.#retire(texture.gpu);
        texture.gpu = null;
        texture.view = null;
    }

    #retire(texture: GPUTexture | null): void {
        if (!texture) {
            return;
        }
        if (this.#encoder) {
            this.#garbage.push(texture);
        } else {
            texture.destroy();
        }
    }

    #getEncoder(): GPUCommandEncoder {
        this.#encoder ??= this.#gpu.device.createCommandEncoder();
        return this.#encoder;
    }

    #allocateTexture(
        texture: GPUTextureHandle,
        width: number,
        height: number,
    ): void {
        this.#retire(texture.gpu);
        const gpu = this.#gpu.device.createTexture({
            size: [width, height],
            format: SCREEN_FORMAT,
            usage:
                TextureUsage.TEXTURE_BINDING |
                TextureUsage.COPY_DST |
                TextureUsage.RENDER_ATTACHMENT,
        });
        texture.gpu = gpu;
        texture.view = gpu.createView();
        texture.width = width;
        texture.height = height;
    }

    /** Copy the source into the texture. Rows go bottom-up, like WebGL. */
    #upload(texture: GPUTextureHandle, strict: boolean): void {
        texture.needsUpdate = false;
        const src = texture.source;
        if (!src) {
            return;
        }
        const [w, h] = sourceSize(src);
        if (w === 0 || h === 0) {
            return;
        }
        if (w !== texture.width || h !== texture.height) {
            this.#allocateTexture(texture, w, h);
        }
        try {
            this.#gpu.device.queue.copyExternalImageToTexture(
                { source: src, flipY: true },
                {
                    texture: texture.gpu as GPUTexture,
                    premultipliedAlpha: texture.premultiplyAlpha,
                },
                [w, h],
            );
        } catch (e) {
            if (strict) {
                throw e;
            }
            console.error(e);
        }
    }

    #createShader(code: string): ShaderEntry {
        const bindings = reflectWgsl(code);
        const { device } = this.#gpu;
        const entries: GPUBindGroupLayoutEntry[] = [];
        const visibility = FRAGMENT_STAGE;
        if (bindings.uniform) {
            entries.push({
                binding: bindings.uniform.binding,
                visibility,
                buffer: { type: "uniform" },
            });
        }
        for (const t of bindings.textures) {
            entries.push({
                binding: t.binding,
                visibility,
                texture: { sampleType: "float" },
            });
        }
        for (const s of bindings.samplers) {
            entries.push({
                binding: s.binding,
                visibility,
                sampler: { type: "filtering" },
            });
        }
        const bindGroupLayout = device.createBindGroupLayout({ entries });
        return {
            code,
            bindings,
            module: device.createShaderModule({ code }),
            bindGroupLayout,
            pipelineLayout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            pipelines: new Map(),
            warned: new Set(),
        };
    }

    /** The pipeline for this state, built async on first use. */
    #pipeline(
        entry: ShaderEntry,
        blend: BlendMode,
        format: GPUTextureFormat,
    ): PipelineState {
        const key = `${blend}|${format}`;
        let state = entry.pipelines.get(key);
        if (state) {
            return state;
        }
        const newState: PipelineState = { pipeline: null, failed: false };
        entry.pipelines.set(key, newState);
        state = newState;
        const { device, vertexModule } = this.#gpu;
        // Never the sync createRenderPipeline: it blocks the first draw.
        device
            .createRenderPipelineAsync({
                layout: entry.pipelineLayout,
                vertex: { module: vertexModule },
                fragment: {
                    module: entry.module,
                    targets: [{ format, blend: blendState(blend) }],
                },
                primitive: { topology: "triangle-list" },
            })
            .then((pipeline) => {
                if (device === this.#gpu.device) {
                    newState.pipeline = pipeline;
                }
            })
            .catch(async (err) => {
                newState.failed = true;
                if (device !== this.#gpu.device || entry.warned.has("build")) {
                    return;
                }
                entry.warned.add("build");
                const info = await entry.module.getCompilationInfo();
                const lines = info.messages.map(
                    (m) =>
                        `${m.type} at ${m.lineNum}:${m.linePos}: ${m.message}`,
                );
                console.error(
                    `[VFX-JS] WGSL pipeline failed: ${err?.message ?? err}\n${lines.join("\n")}`,
                );
            });
        return state;
    }

    #bindGroup(
        entry: ShaderEntry,
        command: DrawCommand,
        target: GPURenderTargetHandle,
    ): GPUBindGroup {
        const { device } = this.#gpu;
        const { bindings } = entry;
        const uniforms = command.uniforms;
        const entries: GPUBindGroupEntry[] = [];

        if (bindings.uniform) {
            const values: Record<string, unknown> = {};
            for (const [name, u] of Object.entries(uniforms)) {
                values[name] = u.value;
            }
            const data = packUniforms(bindings.uniform.layout, values);
            const buffer = this.#uniformBuffer(data.byteLength);
            device.queue.writeBuffer(buffer, 0, data);
            entries.push({
                binding: bindings.uniform.binding,
                resource: { buffer },
            });
        }
        this.#warnUnknownUniforms(entry, command);

        const textureOf = (name: string): GPUTextureHandle => {
            const value = uniforms[name]?.value;
            if (value instanceof GPUTextureHandle && value.view) {
                return value;
            }
            return this.#emptyTexture;
        };
        for (const t of bindings.textures) {
            const texture = textureOf(t.name);
            if (texture === target.texture) {
                throw new Error(
                    `[VFX-JS] "${t.name}" is the texture this pass draws to.`,
                );
            }
            if (texture.needsUpdate) {
                this.#upload(texture, false);
            }
            entries.push({
                binding: t.binding,
                resource: texture.view as GPUTextureView,
            });
        }
        for (const s of bindings.samplers) {
            const name = samplerTextureName(s.name);
            const texture = name ? textureOf(name) : this.#emptyTexture;
            entries.push({
                binding: s.binding,
                resource: this.#sampler(texture),
            });
        }
        return device.createBindGroup({
            layout: entry.bindGroupLayout,
            entries,
        });
    }

    #warnUnknownUniforms(entry: ShaderEntry, command: DrawCommand): void {
        const known = new Set<string>([
            ...(entry.bindings.uniform?.layout.fields.map((f) => f.name) ?? []),
            ...entry.bindings.textures.map((t) => t.name),
        ]);
        for (const [name, u] of Object.entries(command.uniforms)) {
            if (
                known.has(name) ||
                BUILTIN_UNIFORMS.has(name) ||
                u.value instanceof GPUTextureHandle ||
                entry.warned.has(name)
            ) {
                continue;
            }
            entry.warned.add(name);
            console.warn(
                `[VFX-JS] WGSL shader has no uniform "${name}"; ignoring it.`,
            );
        }
    }

    #uniformBuffer(size: number): GPUBuffer {
        let pool = this.#uniformBuffers.get(size);
        if (!pool) {
            pool = { buffers: [], used: 0 };
            this.#uniformBuffers.set(size, pool);
        }
        if (pool.used === pool.buffers.length) {
            pool.buffers.push(
                this.#gpu.device.createBuffer({
                    size,
                    usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
                }),
            );
        }
        return pool.buffers[pool.used++];
    }

    #sampler(texture: GPUTextureHandle): GPUSampler {
        const key = `${texture.wrapS},${texture.wrapT},${texture.minFilter},${texture.magFilter}`;
        let sampler = this.#samplers.get(key);
        if (!sampler) {
            sampler = this.#gpu.device.createSampler({
                addressModeU: addressMode(texture.wrapS),
                addressModeV: addressMode(texture.wrapT),
                minFilter: texture.minFilter,
                magFilter: texture.magFilter,
            });
            this.#samplers.set(key, sampler);
        }
        return sampler;
    }

    #watchLoss(): void {
        const device = this.#gpu.device;
        device.lost.then((info) => {
            if (this.#disposed || info.reason === "destroyed") {
                return;
            }
            console.warn(`[VFX-JS] WebGPU device lost: ${info.message}`);
            this.#isLost = true;
            this.#encoder = null;
            this.#garbage = [];
            for (const cb of this.#onLost) {
                cb();
            }
            this.#restore().catch((err) => {
                console.error("[VFX-JS] Failed to restore WebGPU:", err);
            });
        });
    }

    /** Get a new device and rebuild every resource on it. */
    async #restore(): Promise<void> {
        const gpu = await requestDevice(this.#context);
        if (this.#disposed) {
            gpu.device.destroy();
            return;
        }
        this.#gpu = gpu;
        this.#samplers.clear();
        this.#uniformBuffers.clear();
        for (const [code, entry] of this.#shaders) {
            const fresh = this.#createShader(code);
            entry.module = fresh.module;
            entry.bindGroupLayout = fresh.bindGroupLayout;
            entry.pipelineLayout = fresh.pipelineLayout;
            entry.pipelines.clear();
        }
        for (const texture of this.#textures) {
            texture.gpu = null;
            this.#allocateTexture(texture, 1, 1);
            texture.needsUpdate = texture.source !== null;
        }
        for (const target of this.#targets) {
            target.texture.gpu = null;
            this.allocateTarget(target);
        }
        this.#isLost = false;
        this.#watchLoss();
        for (const cb of this.#onRestored) {
            cb();
        }
    }
}
