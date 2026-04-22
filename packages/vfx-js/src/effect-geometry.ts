import type { GLContext, Restorable } from "./gl/context.js";
import type { Program } from "./gl/program.js";
import type { Quad } from "./gl/quad.js";
import type {
    EffectAttributeDescriptor,
    EffectAttributeTypedArray,
    EffectGeometry,
    EffectQuad,
} from "./types.js";

/**
 * Singleton token returned as `ctx.quad`.
 *
 * All hosts share the same token — it always resolves to the shared
 * {@link Quad} (NDC -1..1 fullscreen).
 * @internal
 */
export const EFFECT_QUAD_TOKEN: EffectQuad = Object.freeze({
    __brand: "EffectQuad",
});

/** @internal */
export function isEffectQuad(g: unknown): g is EffectQuad {
    return (
        g === EFFECT_QUAD_TOKEN ||
        (typeof g === "object" &&
            g !== null &&
            (g as { __brand?: unknown }).__brand === "EffectQuad")
    );
}

type NormalizedAttribute = {
    name: string;
    data: EffectAttributeTypedArray;
    itemSize: 1 | 2 | 3 | 4;
    normalized: boolean;
    perInstance: boolean;
    location: number | undefined;
};

function modeEnum(gl: WebGL2RenderingContext, mode: string | undefined): number {
    switch (mode) {
        case "lines":
            return gl.LINES;
        case "lineStrip":
            return gl.LINE_STRIP;
        case "points":
            return gl.POINTS;
        default:
            return gl.TRIANGLES;
    }
}

function attribTypeEnum(
    gl: WebGL2RenderingContext,
    data: EffectAttributeTypedArray,
): number {
    if (data instanceof Float32Array) return gl.FLOAT;
    if (data instanceof Uint8Array) return gl.UNSIGNED_BYTE;
    if (data instanceof Uint16Array) return gl.UNSIGNED_SHORT;
    if (data instanceof Uint32Array) return gl.UNSIGNED_INT;
    if (data instanceof Int8Array) return gl.BYTE;
    if (data instanceof Int16Array) return gl.SHORT;
    if (data instanceof Int32Array) return gl.INT;
    throw new Error("[VFX-JS] Unsupported attribute typed array");
}

function normalizeAttribute(
    name: string,
    desc: EffectAttributeDescriptor,
): NormalizedAttribute {
    if (ArrayBuffer.isView(desc) && !(desc instanceof DataView)) {
        // Shorthand: typed array only. Default itemSize=2 (common for
        // "position" 2D). If position is actually 3D the user must use
        // the explicit form.
        return {
            name,
            data: desc as EffectAttributeTypedArray,
            itemSize: 2,
            normalized: false,
            perInstance: false,
            location: undefined,
        };
    }
    const d = desc as Exclude<EffectAttributeDescriptor, EffectAttributeTypedArray>;
    return {
        name,
        data: d.data,
        itemSize: d.itemSize,
        normalized: d.normalized ?? false,
        perInstance: d.perInstance ?? false,
        location: d.location,
    };
}

/**
 * Compiled VAO + buffers for an (EffectGeometry, Program) pair.
 *
 * Registered on {@link GLContext} so context-restore rebuilds the VAO
 * and its VBOs / IBO from the original POJO descriptors.
 * @internal
 */
export class CompiledGeometry implements Restorable {
    gl: WebGL2RenderingContext;
    vao!: WebGLVertexArrayObject;
    #ctx: GLContext;
    #geo: EffectGeometry;
    #program: Program;
    #vbos: WebGLBuffer[] = [];
    #ibo: WebGLBuffer | null = null;

    mode: number;
    /** gl.UNSIGNED_SHORT or gl.UNSIGNED_INT (when indexed). */
    indexType = 0;
    hasIndices = false;
    /** Number of vertices / indices to draw (after drawRange). */
    drawCount = 0;
    /** Offset in the attribute / index buffer (after drawRange). */
    drawStart = 0;
    instanceCount: number;
    #registered = false;

    constructor(ctx: GLContext, geo: EffectGeometry, program: Program) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.#geo = geo;
        this.#program = program;
        this.mode = modeEnum(this.gl, geo.mode);
        this.instanceCount = geo.instanceCount ?? 0;
        this.#allocate();
        ctx.addResource(this);
        this.#registered = true;
    }

    #allocate(): void {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        if (!vao) {
            throw new Error("[VFX-JS] Failed to create VAO");
        }
        this.vao = vao;
        gl.bindVertexArray(vao);

        const programHandle = this.#program.program;
        let vertexCountFromPosition: number | null = null;

        for (const [name, descriptor] of Object.entries(this.#geo.attributes)) {
            const attr = normalizeAttribute(name, descriptor);
            // For GLSL today, `location?` is ignored — program is already
            // linked and `bindAttribLocation` must precede link. We resolve
            // via getAttribLocation. WGSL (future) will honor it.
            const loc = gl.getAttribLocation(programHandle, attr.name);
            if (loc < 0) {
                // Attribute isn't declared in this program; skip silently.
                continue;
            }
            const buffer = gl.createBuffer();
            if (!buffer) {
                throw new Error(
                    `[VFX-JS] Failed to create VBO for "${attr.name}"`,
                );
            }
            this.#vbos.push(buffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, attr.data, gl.STATIC_DRAW);
            const type = attribTypeEnum(gl, attr.data);
            gl.enableVertexAttribArray(loc);
            if (
                type === gl.FLOAT ||
                type === gl.HALF_FLOAT ||
                attr.normalized
            ) {
                gl.vertexAttribPointer(
                    loc,
                    attr.itemSize,
                    type,
                    attr.normalized,
                    0,
                    0,
                );
            } else {
                gl.vertexAttribIPointer(loc, attr.itemSize, type, 0, 0);
            }
            if (attr.perInstance) {
                gl.vertexAttribDivisor(loc, 1);
            }
            if (name === "position" && vertexCountFromPosition === null) {
                vertexCountFromPosition =
                    attr.data.length / attr.itemSize;
            }
        }

        if (this.#geo.indices) {
            const ibo = gl.createBuffer();
            if (!ibo) {
                throw new Error("[VFX-JS] Failed to create IBO");
            }
            this.#ibo = ibo;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
            gl.bufferData(
                gl.ELEMENT_ARRAY_BUFFER,
                this.#geo.indices,
                gl.STATIC_DRAW,
            );
            this.hasIndices = true;
            this.indexType =
                this.#geo.indices instanceof Uint32Array
                    ? gl.UNSIGNED_INT
                    : gl.UNSIGNED_SHORT;
        } else {
            this.hasIndices = false;
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (this.#ibo) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }

        // Compute drawCount / drawStart.
        const totalCount = this.hasIndices
            ? this.#geo.indices!.length
            : (vertexCountFromPosition ?? 0);
        const range = this.#geo.drawRange;
        this.drawStart = range?.start ?? 0;
        this.drawCount =
            range?.count !== undefined
                ? range.count
                : Math.max(0, totalCount - this.drawStart);
    }

    restore(): void {
        // Old VAO / VBOs / IBO are dead; rebuild with fresh handles.
        this.#vbos = [];
        this.#ibo = null;
        this.#allocate();
    }

    draw(): void {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        if (this.hasIndices) {
            if (this.instanceCount > 0) {
                gl.drawElementsInstanced(
                    this.mode,
                    this.drawCount,
                    this.indexType,
                    this.drawStart *
                        (this.indexType === gl.UNSIGNED_INT ? 4 : 2),
                    this.instanceCount,
                );
            } else {
                gl.drawElements(
                    this.mode,
                    this.drawCount,
                    this.indexType,
                    this.drawStart *
                        (this.indexType === gl.UNSIGNED_INT ? 4 : 2),
                );
            }
        } else if (this.instanceCount > 0) {
            gl.drawArraysInstanced(
                this.mode,
                this.drawStart,
                this.drawCount,
                this.instanceCount,
            );
        } else {
            gl.drawArrays(this.mode, this.drawStart, this.drawCount);
        }
    }

    dispose(): void {
        if (this.#registered) {
            this.#ctx.removeResource(this);
            this.#registered = false;
        }
        const gl = this.gl;
        gl.deleteVertexArray(this.vao);
        for (const b of this.#vbos) {
            gl.deleteBuffer(b);
        }
        if (this.#ibo) {
            gl.deleteBuffer(this.#ibo);
        }
        this.#vbos = [];
        this.#ibo = null;
    }
}

/**
 * Per-host cache of compiled geometries, keyed by (EffectGeometry, Program).
 *
 * The program dimension is required because `gl.getAttribLocation` is
 * program-specific — caching only by geometry would break on a second
 * program whose attribute name → location assignment differs.
 *
 * Uses a `WeakMap` for primary lookup plus a parallel `Set` so
 * {@link dispose} can iterate every compiled entry the host owns.
 * @internal
 */
export class EffectGeometryCache {
    #ctx: GLContext;
    #quad: Quad;
    #map = new WeakMap<EffectGeometry, Map<Program, CompiledGeometry>>();
    #all = new Set<CompiledGeometry>();

    constructor(ctx: GLContext, quad: Quad) {
        this.#ctx = ctx;
        this.#quad = quad;
    }

    /** The shared fullscreen {@link Quad} (resolves {@link EFFECT_QUAD_TOKEN}). */
    get quad(): Quad {
        return this.#quad;
    }

    resolve(geo: EffectGeometry, program: Program): CompiledGeometry {
        let byProgram = this.#map.get(geo);
        if (!byProgram) {
            byProgram = new Map();
            this.#map.set(geo, byProgram);
        }
        let compiled = byProgram.get(program);
        if (!compiled) {
            compiled = new CompiledGeometry(this.#ctx, geo, program);
            byProgram.set(program, compiled);
            this.#all.add(compiled);
        }
        return compiled;
    }

    dispose(): void {
        for (const c of this.#all) {
            c.dispose();
        }
        this.#all.clear();
        // WeakMap entries become unreachable naturally when the user
        // releases their geometry refs; the Programs are disposed by the
        // host separately.
    }
}
