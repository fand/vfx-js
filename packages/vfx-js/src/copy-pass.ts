import * as THREE from "three";
import { COPY_FRAGMENT_SHADER, DEFAULT_VERTEX_SHADER } from "./constants.js";
import type { GLRect } from "./gl-rect.js";

export class CopyPass {
    #scene: THREE.Scene;
    #mesh: THREE.Mesh;
    #uniforms: { [name: string]: THREE.IUniform };

    constructor() {
        this.#scene = new THREE.Scene();
        this.#uniforms = {
            src: { value: null },
            offset: { value: new THREE.Vector2() },
            resolution: { value: new THREE.Vector2() },
            viewport: { value: new THREE.Vector4() },
        };
        this.#mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.RawShaderMaterial({
                vertexShader: DEFAULT_VERTEX_SHADER,
                fragmentShader: COPY_FRAGMENT_SHADER,
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

    setUniforms(tex: THREE.Texture, pixelRatio: number, xywh: GLRect) {
        this.#uniforms["src"].value = tex;
        this.#uniforms["resolution"].value.x = xywh.w * pixelRatio;
        this.#uniforms["resolution"].value.y = xywh.h * pixelRatio;
        this.#uniforms["offset"].value.x = xywh.x * pixelRatio;
        this.#uniforms["offset"].value.y = xywh.y * pixelRatio;
    }

    get scene(): THREE.Scene {
        return this.#scene;
    }
}
