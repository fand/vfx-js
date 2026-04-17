import { Backbuffer } from "./backbuffer.js";
import { DEFAULT_VERTEX_SHADER } from "./constants.js";
import type { GLRect } from "./gl-rect.js";
import type { GLContext } from "./gl/context.js";
import type { Pass } from "./gl/pass.js";
import type { Uniforms } from "./gl/program.js";
import type { Texture } from "./gl/texture.js";
import { Vec2, Vec4 } from "./gl/vec.js";
import { createPassMaterial } from "./render-target.js";
import type { VFXUniformValue, VFXUniforms } from "./types.js";

/**
 * A single post-effect pass. Owns its shader program, uniforms, and
 * optional persistent backbuffer.
 * @internal
 */
export class PostEffectPass {
    pass: Pass;
    #uniforms: Uniforms;
    #uniformGenerators: { [name: string]: () => VFXUniformValue };
    #backbuffer?: Backbuffer;
    #persistent: boolean;
    #float: boolean;
    #size?: [number, number];

    constructor(
        ctx: GLContext,
        fragmentShader: string,
        uniforms?: VFXUniforms,
        persistent?: boolean,
        float?: boolean,
        size?: [number, number],
        hasBufferTarget?: boolean,
    ) {
        this.#persistent = persistent ?? false;
        this.#float = float ?? false;
        this.#size = size;
        this.#uniformGenerators = {};
        this.#uniforms = {
            src: { value: null },
            offset: { value: new Vec2() },
            resolution: { value: new Vec2() },
            viewport: { value: new Vec4() },
            time: { value: 0.0 },
            mouse: { value: new Vec2() },
            passIndex: { value: 0 },
        };

        if (uniforms) {
            for (const [key, value] of Object.entries(uniforms)) {
                if (typeof value === "function") {
                    this.#uniformGenerators[key] = value;
                    this.#uniforms[key] = { value: value() };
                } else {
                    this.#uniforms[key] = { value };
                }
            }
        }

        this.pass = createPassMaterial(ctx, {
            vertexShader: DEFAULT_VERTEX_SHADER,
            fragmentShader,
            uniforms: this.#uniforms,
            renderingToBuffer: hasBufferTarget ?? false,
            premultipliedAlpha: true,
        });
    }

    get uniforms(): Uniforms {
        return this.#uniforms;
    }

    setUniforms(
        tex: Texture,
        pixelRatio: number,
        xywh: GLRect,
        time: number,
        mouseX: number,
        mouseY: number,
    ): void {
        this.#uniforms.src.value = tex;
        (this.#uniforms.resolution.value as Vec2).set(
            xywh.w * pixelRatio,
            xywh.h * pixelRatio,
        );
        (this.#uniforms.offset.value as Vec2).set(
            xywh.x * pixelRatio,
            xywh.y * pixelRatio,
        );
        this.#uniforms.time.value = time;
        (this.#uniforms.mouse.value as Vec2).set(
            mouseX * pixelRatio,
            mouseY * pixelRatio,
        );
    }

    updateCustomUniforms(uniformGenerators?: {
        [name: string]: () => VFXUniformValue;
    }): void {
        for (const [key, generator] of Object.entries(
            this.#uniformGenerators,
        )) {
            if (this.#uniforms[key]) {
                this.#uniforms[key].value = generator();
            }
        }
        if (uniformGenerators) {
            for (const [key, generator] of Object.entries(uniformGenerators)) {
                if (this.#uniforms[key]) {
                    this.#uniforms[key].value = generator();
                }
            }
        }
    }

    initializeBackbuffer(
        ctx: GLContext,
        width: number,
        height: number,
        pixelRatio: number,
    ): void {
        if (this.#persistent && !this.#backbuffer) {
            if (this.#size) {
                this.#backbuffer = new Backbuffer(
                    ctx,
                    this.#size[0],
                    this.#size[1],
                    1,
                    this.#float,
                );
            } else {
                this.#backbuffer = new Backbuffer(
                    ctx,
                    width,
                    height,
                    pixelRatio,
                    this.#float,
                );
            }
        }
    }

    resizeBackbuffer(width: number, height: number): void {
        if (this.#backbuffer && !this.#size) {
            this.#backbuffer.resize(width, height);
        }
    }

    /**
     * Register a named buffer texture as a uniform (for auto-binding).
     * The texture value will be updated each frame by the render loop.
     */
    registerBufferUniform(name: string): void {
        if (!this.#uniforms[name]) {
            this.#uniforms[name] = { value: null };
        }
    }

    get backbuffer(): Backbuffer | undefined {
        return this.#backbuffer;
    }

    get persistent(): boolean {
        return this.#persistent;
    }

    get float(): boolean {
        return this.#float;
    }

    get size(): [number, number] | undefined {
        return this.#size;
    }

    /**
     * Get target dimensions for this pass.
     * Returns undefined if no custom size is set (uses viewport resolution).
     */
    getTargetDimensions(): [number, number] | undefined {
        return this.#size;
    }

    dispose(): void {
        this.pass.dispose();
        this.#backbuffer?.dispose();
    }
}
