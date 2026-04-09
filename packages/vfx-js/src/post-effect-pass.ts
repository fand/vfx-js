import * as THREE from "three";
import { Backbuffer } from "./backbuffer.js";
import { DEFAULT_VERTEX_SHADER } from "./constants.js";
import type { GLRect } from "./gl-rect.js";
import { createPassMaterial } from "./render-target.js";
import type { VFXUniformValue, VFXUniforms } from "./types.js";

export class PostEffectPass {
    #scene: THREE.Scene;
    #mesh: THREE.Mesh;
    #uniforms: { [name: string]: THREE.IUniform };
    #uniformGenerators: { [name: string]: () => VFXUniformValue };
    #backbuffer?: Backbuffer;
    #persistent: boolean;
    #float: boolean;
    #size?: [number, number];

    constructor(
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
        this.#scene = new THREE.Scene();
        this.#uniformGenerators = {};
        this.#uniforms = {
            src: { value: null },
            offset: { value: new THREE.Vector2() },
            resolution: { value: new THREE.Vector2() },
            viewport: { value: new THREE.Vector4() },
            time: { value: 0.0 },
            mouse: { value: new THREE.Vector2() },
            passIndex: { value: 0 },
        };

        // Add custom uniforms if provided
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

        this.#mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            createPassMaterial({
                vertexShader: DEFAULT_VERTEX_SHADER,
                fragmentShader,
                uniforms: this.#uniforms,
                glslVersion: "300 es",
                renderingToBuffer: hasBufferTarget ?? false,
                premultipliedAlpha: true,
            }),
        );
        this.#scene.add(this.#mesh);
    }

    get uniforms() {
        return this.#uniforms;
    }

    setUniforms(
        tex: THREE.Texture,
        pixelRatio: number,
        xywh: GLRect,
        time: number,
        mouseX: number,
        mouseY: number,
    ) {
        this.#uniforms["src"].value = tex;
        this.#uniforms["resolution"].value.x = xywh.w * pixelRatio;
        this.#uniforms["resolution"].value.y = xywh.h * pixelRatio;
        this.#uniforms["offset"].value.x = xywh.x * pixelRatio;
        this.#uniforms["offset"].value.y = xywh.y * pixelRatio;
        this.#uniforms["time"].value = time;
        this.#uniforms["mouse"].value.x = mouseX * pixelRatio;
        this.#uniforms["mouse"].value.y = mouseY * pixelRatio;
    }

    updateCustomUniforms(uniformGenerators?: {
        [name: string]: () => VFXUniformValue;
    }) {
        // Update uniforms from constructor generators
        for (const [key, generator] of Object.entries(
            this.#uniformGenerators,
        )) {
            if (this.#uniforms[key]) {
                this.#uniforms[key].value = generator();
            }
        }

        // Update uniforms from external generators (for compatibility)
        if (uniformGenerators) {
            for (const [key, generator] of Object.entries(uniformGenerators)) {
                if (this.#uniforms[key]) {
                    this.#uniforms[key].value = generator();
                }
            }
        }
    }

    initializeBackbuffer(
        width: number,
        height: number,
        pixelRatio: number,
        floatRTType: THREE.TextureDataType,
    ) {
        if (this.#persistent && !this.#backbuffer) {
            if (this.#size) {
                this.#backbuffer = new Backbuffer(
                    this.#size[0],
                    this.#size[1],
                    1,
                    this.#float,
                    floatRTType,
                );
            } else {
                this.#backbuffer = new Backbuffer(
                    width,
                    height,
                    pixelRatio,
                    this.#float,
                    floatRTType,
                );
            }
        }
    }

    resizeBackbuffer(width: number, height: number) {
        if (this.#backbuffer) {
            if (this.#size) {
                // Fixed size: no resize needed
            } else {
                this.#backbuffer.resize(width, height);
            }
        }
    }

    /**
     * Register a named buffer texture as a uniform (for auto-binding).
     * The texture value will be updated each frame by the render loop.
     */
    registerBufferUniform(name: string) {
        if (!this.#uniforms[name]) {
            this.#uniforms[name] = { value: null };
        }
    }

    get backbuffer() {
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

    get scene(): THREE.Scene {
        return this.#scene;
    }
}
