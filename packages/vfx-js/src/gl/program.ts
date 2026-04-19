import type { GLContext, Restorable } from "./context.js";
import { Texture } from "./texture.js";
import { Vec2, Vec4 } from "./vec.js";

/** @internal */
export type UniformValue =
    | number
    | boolean
    | Vec2
    | Vec4
    | Texture
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | number[]
    | Float32Array
    | Int32Array
    | Uint32Array;

/** @internal */
export type Uniform = { value: UniformValue | null };

/** @internal */
export type Uniforms = { [name: string]: Uniform };

/**
 * GLSL ES version of a shader. When omitted on a VFX prop, it is
 * auto-detected from the fragment shader via {@link detectGlslVersion}:
 * GLSL 100 markers (`gl_FragColor`, `texture2D`, `varying`, `attribute`)
 * pick `"100"`, otherwise `"300 es"`.
 */
export type GlslVersion = "100" | "300 es";

/** @see {@link GlslVersion} */
export function detectGlslVersion(src: string): GlslVersion {
    if (/#version\s+300\s+es\b/.test(src)) {
        return "300 es";
    }
    if (/#version\s+100\b/.test(src)) {
        return "100";
    }
    if (/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(src)) {
        return "100";
    }
    return "300 es";
}

type ActiveUniform = {
    location: WebGLUniformLocation;
    type: number;
    size: number;
};

/**
 * Compiled GLSL program. Handles vertex/fragment shader compilation,
 * link, attribute binding (attribute "position" → location 0), and
 * uniform upload.
 *
 * GLSL version: `glslVersion` if given, else auto-detected from the
 * fragment shader via {@link detectGlslVersion}.
 *
 * Self-registers with {@link GLContext} so the program is recompiled
 * after a `webglcontextrestored` event.
 * @internal
 */
export class Program implements Restorable {
    gl: WebGL2RenderingContext;
    program!: WebGLProgram;
    #ctx: GLContext;
    #vertSrc: string;
    #fragSrc: string;
    #glslVersion: GlslVersion;
    #uniforms = new Map<string, ActiveUniform>();

    constructor(
        ctx: GLContext,
        vertSrc: string,
        fragSrc: string,
        glslVersion?: GlslVersion,
    ) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.#vertSrc = vertSrc;
        this.#fragSrc = fragSrc;
        this.#glslVersion = glslVersion ?? detectGlslVersion(fragSrc);
        this.#compile();
        ctx.addResource(this);
    }

    #compile(): void {
        const gl = this.gl;
        const vs = compileShader(
            gl,
            gl.VERTEX_SHADER,
            ensureVersion(this.#vertSrc, this.#glslVersion),
        );
        const fs = compileShader(
            gl,
            gl.FRAGMENT_SHADER,
            ensureVersion(this.#fragSrc, this.#glslVersion),
        );

        const program = gl.createProgram();
        if (!program) {
            throw new Error("[VFX-JS] Failed to create program");
        }
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        // Pin "position" to attribute location 0 so the shared Quad VAO
        // works across all programs.
        gl.bindAttribLocation(program, 0, "position");
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(program) ?? "";
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.deleteProgram(program);
            throw new Error(`[VFX-JS] Program link failed: ${log}`);
        }
        gl.detachShader(program, vs);
        gl.detachShader(program, fs);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        this.program = program;

        this.#uniforms.clear();
        const count = gl.getProgramParameter(
            program,
            gl.ACTIVE_UNIFORMS,
        ) as number;
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(program, i);
            if (!info) {
                continue;
            }
            const name = info.name.replace(/\[0\]$/, "");
            const location = gl.getUniformLocation(program, info.name);
            if (!location) {
                continue;
            }
            this.#uniforms.set(name, {
                location,
                type: info.type,
                size: info.size,
            });
        }
    }

    restore(): void {
        // The old handle is dead after context loss; recompile from source.
        this.#compile();
    }

    use(): void {
        this.gl.useProgram(this.program);
    }

    hasUniform(name: string): boolean {
        return this.#uniforms.has(name);
    }

    /** Upload a set of uniforms. Samplers auto-allocate texture units. */
    uploadUniforms(uniforms: Uniforms): void {
        const gl = this.gl;
        let textureUnit = 0;
        for (const [name, info] of this.#uniforms) {
            const entry = uniforms[name];
            if (!entry) {
                continue;
            }
            const value = entry.value;
            if (value === null || value === undefined) {
                continue;
            }

            if (isSamplerType(info.type)) {
                if (value instanceof Texture) {
                    value.bind(textureUnit);
                    gl.uniform1i(info.location, textureUnit);
                    textureUnit++;
                }
                continue;
            }
            if (value instanceof Texture) {
                continue;
            }
            uploadScalarUniform(gl, info, value);
        }
    }

    dispose(): void {
        this.#ctx.removeResource(this);
        this.gl.deleteProgram(this.program);
    }
}

function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    src: string,
): WebGLShader {
    const sh = gl.createShader(type);
    if (!sh) {
        throw new Error("[VFX-JS] Failed to create shader");
    }
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh) ?? "";
        gl.deleteShader(sh);
        throw new Error(`[VFX-JS] Shader compile failed: ${log}\n\n${src}`);
    }
    return sh;
}

function ensureVersion(src: string, version: GlslVersion): string {
    const trimmed = src.replace(/^\s+/, "");
    if (trimmed.startsWith("#version")) {
        return src;
    }
    if (version === "100") {
        // WebGL2 default is GLSL ES 1.00 when no directive is present.
        return src;
    }
    return `#version 300 es\n${src}`;
}

function isSamplerType(type: number): boolean {
    // WebGL2 sampler enum values.
    return (
        type === 0x8b5e || // SAMPLER_2D
        type === 0x8dca || // INT_SAMPLER_2D
        type === 0x8dd2 || // UNSIGNED_INT_SAMPLER_2D
        type === 0x8b62 // SAMPLER_2D_SHADOW
    );
}

/** Track unsupported uniform types we've already warned about to avoid log spam. */
const warnedUnsupportedTypes = new Set<number>();

/** @internal — exported for testability; not part of the public API. */
export function uploadScalarUniform(
    gl: WebGL2RenderingContext,
    info: ActiveUniform,
    value: Exclude<UniformValue, Texture>,
): void {
    const loc = info.location;
    const isArray = info.size > 1;
    const fv = value as Float32Array | number[];
    const iv = value as Int32Array | number[];
    const uv = value as Uint32Array | number[];

    switch (info.type) {
        case gl.FLOAT:
            if (isArray) {
                gl.uniform1fv(loc, fv);
            } else {
                gl.uniform1f(loc, value as number);
            }
            return;
        case gl.FLOAT_VEC2:
            if (isArray) {
                gl.uniform2fv(loc, fv);
            } else if (value instanceof Vec2) {
                gl.uniform2f(loc, value.x, value.y);
            } else {
                const v = value as [number, number];
                gl.uniform2f(loc, v[0], v[1]);
            }
            return;
        case gl.FLOAT_VEC3:
            if (isArray) {
                gl.uniform3fv(loc, fv);
            } else {
                const v = value as [number, number, number];
                gl.uniform3f(loc, v[0], v[1], v[2]);
            }
            return;
        case gl.FLOAT_VEC4:
            if (isArray) {
                gl.uniform4fv(loc, fv);
            } else if (value instanceof Vec4) {
                gl.uniform4f(loc, value.x, value.y, value.z, value.w);
            } else {
                const v = value as [number, number, number, number];
                gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
            }
            return;
        case gl.INT:
            if (isArray) {
                gl.uniform1iv(loc, iv);
            } else {
                gl.uniform1i(loc, value as number);
            }
            return;
        case gl.INT_VEC2:
            if (isArray) {
                gl.uniform2iv(loc, iv);
            } else {
                const v = value as [number, number];
                gl.uniform2i(loc, v[0], v[1]);
            }
            return;
        case gl.INT_VEC3:
            if (isArray) {
                gl.uniform3iv(loc, iv);
            } else {
                const v = value as [number, number, number];
                gl.uniform3i(loc, v[0], v[1], v[2]);
            }
            return;
        case gl.INT_VEC4:
            if (isArray) {
                gl.uniform4iv(loc, iv);
            } else {
                const v = value as [number, number, number, number];
                gl.uniform4i(loc, v[0], v[1], v[2], v[3]);
            }
            return;
        case gl.BOOL:
            if (isArray) {
                gl.uniform1iv(loc, iv);
            } else {
                gl.uniform1i(loc, value ? 1 : 0);
            }
            return;
        case gl.BOOL_VEC2:
            if (isArray) {
                gl.uniform2iv(loc, iv);
            } else {
                const v = value as [number, number];
                gl.uniform2i(loc, v[0] ? 1 : 0, v[1] ? 1 : 0);
            }
            return;
        case gl.BOOL_VEC3:
            if (isArray) {
                gl.uniform3iv(loc, iv);
            } else {
                const v = value as [number, number, number];
                gl.uniform3i(loc, v[0] ? 1 : 0, v[1] ? 1 : 0, v[2] ? 1 : 0);
            }
            return;
        case gl.BOOL_VEC4:
            if (isArray) {
                gl.uniform4iv(loc, iv);
            } else {
                const v = value as [number, number, number, number];
                gl.uniform4i(
                    loc,
                    v[0] ? 1 : 0,
                    v[1] ? 1 : 0,
                    v[2] ? 1 : 0,
                    v[3] ? 1 : 0,
                );
            }
            return;
        case gl.FLOAT_MAT2:
            gl.uniformMatrix2fv(loc, false, fv);
            return;
        case gl.FLOAT_MAT3:
            gl.uniformMatrix3fv(loc, false, fv);
            return;
        case gl.FLOAT_MAT4:
            gl.uniformMatrix4fv(loc, false, fv);
            return;
        case gl.UNSIGNED_INT:
            if (isArray) {
                gl.uniform1uiv(loc, uv);
            } else {
                gl.uniform1ui(loc, value as number);
            }
            return;
        case gl.UNSIGNED_INT_VEC2:
            if (isArray) {
                gl.uniform2uiv(loc, uv);
            } else {
                const v = value as [number, number];
                gl.uniform2ui(loc, v[0], v[1]);
            }
            return;
        case gl.UNSIGNED_INT_VEC3:
            if (isArray) {
                gl.uniform3uiv(loc, uv);
            } else {
                const v = value as [number, number, number];
                gl.uniform3ui(loc, v[0], v[1], v[2]);
            }
            return;
        case gl.UNSIGNED_INT_VEC4:
            if (isArray) {
                gl.uniform4uiv(loc, uv);
            } else {
                const v = value as [number, number, number, number];
                gl.uniform4ui(loc, v[0], v[1], v[2], v[3]);
            }
            return;
        default:
            if (!warnedUnsupportedTypes.has(info.type)) {
                warnedUnsupportedTypes.add(info.type);
                console.warn(
                    `[VFX-JS] Unsupported uniform type 0x${info.type.toString(16)}; skipping upload.`,
                );
            }
            return;
    }
}
