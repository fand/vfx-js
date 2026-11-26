import type { Backend, BackendTexture, Uniforms } from "./backend.js";
import { COPY_FRAGMENT_SHADER, DEFAULT_VERTEX_SHADER } from "./constants.js";
import type { GLRect } from "./gl-rect.js";
import { createPass, type Pass } from "./render-target.js";
import { Vec2, Vec4 } from "./vec.js";

/**
 * Copies a source texture to the current framebuffer with premultiplied
 * alpha blending. Used after rendering an element's backbuffer into
 * the canvas/post-effect RT.
 * @internal
 */
export class CopyPass {
    pass: Pass;
    uniforms: Uniforms;

    constructor(backend: Backend) {
        this.uniforms = {
            src: { value: null },
            offset: { value: new Vec2() },
            resolution: { value: new Vec2() },
            viewport: { value: new Vec4() },
        };
        this.pass = createPass(
            backend,
            DEFAULT_VERTEX_SHADER,
            COPY_FRAGMENT_SHADER,
            this.uniforms,
            "premultiplied",
        );
    }

    setUniforms(tex: BackendTexture, pixelRatio: number, xywh: GLRect): void {
        this.uniforms.src.value = tex;
        (this.uniforms.resolution.value as Vec2).set(
            xywh.w * pixelRatio,
            xywh.h * pixelRatio,
        );
        (this.uniforms.offset.value as Vec2).set(
            xywh.x * pixelRatio,
            xywh.y * pixelRatio,
        );
    }

    dispose(): void {
        this.pass.dispose();
    }
}
