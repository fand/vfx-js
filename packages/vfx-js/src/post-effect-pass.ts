import * as THREE from "three";
import { DEFAULT_VERTEX_SHADER } from "./constants.js";
import type { GLRect } from "./gl-rect.js";
import type { VFXUniformValue, VFXUniforms } from "./types.js";

export class PostEffectPass {
    #scene: THREE.Scene;
    #mesh: THREE.Mesh;
    #uniforms: { [name: string]: THREE.IUniform };

    constructor(fragmentShader: string, uniforms?: VFXUniforms) {
        this.#scene = new THREE.Scene();
        this.#uniforms = {
            src: { value: null },
            offset: { value: new THREE.Vector2() },
            resolution: { value: new THREE.Vector2() },
            viewport: { value: new THREE.Vector4() },
            time: { value: 0.0 },
            mouse: { value: new THREE.Vector2() },
        };

        // Add custom uniforms if provided
        if (uniforms) {
            for (const [key, value] of Object.entries(uniforms)) {
                if (typeof value === "function") {
                    this.#uniforms[key] = { value: value() };
                } else {
                    this.#uniforms[key] = { value };
                }
            }
        }

        this.#mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.RawShaderMaterial({
                vertexShader: DEFAULT_VERTEX_SHADER,
                fragmentShader,
                uniforms: this.#uniforms,
                glslVersion: "300 es",
                transparent: true,
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

    updateCustomUniforms(uniformGenerators: {
        [name: string]: () => VFXUniformValue;
    }) {
        for (const [key, generator] of Object.entries(uniformGenerators)) {
            if (this.#uniforms[key]) {
                this.#uniforms[key].value = generator();
            }
        }
    }

    get scene(): THREE.Scene {
        return this.#scene;
    }
}
