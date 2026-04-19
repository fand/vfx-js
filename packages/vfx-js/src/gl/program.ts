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
    | [number, number, number, number];

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

function uploadScalarUniform(
    gl: WebGL2RenderingContext,
    info: ActiveUniform,
    value: Exclude<UniformValue, Texture>,
): void {
    const loc = info.location;
    switch (info.type) {
        case gl.FLOAT:
            gl.uniform1f(loc, value as number);
            return;
        case gl.FLOAT_VEC2:
            if (value instanceof Vec2) {
                gl.uniform2f(loc, value.x, value.y);
            } else {
                const v = value as [number, number];
                gl.uniform2f(loc, v[0], v[1]);
            }
            return;
        case gl.FLOAT_VEC3: {
            const v = value as [number, number, number];
            gl.uniform3f(loc, v[0], v[1], v[2]);
            return;
        }
        case gl.FLOAT_VEC4:
            if (value instanceof Vec4) {
                gl.uniform4f(loc, value.x, value.y, value.z, value.w);
            } else {
                const v = value as [number, number, number, number];
                gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
            }
            return;
        case gl.INT:
            gl.uniform1i(loc, value as number);
            return;
        case gl.BOOL:
            gl.uniform1i(loc, value ? 1 : 0);
            return;
        default:
            // Unsupported uniform type; skip silently.
            return;
    }
}
