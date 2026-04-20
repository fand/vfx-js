import { COPY_FRAGMENT_SHADER, DEFAULT_VERTEX_SHADER } from "./constants.js";
import type { GLContext } from "./gl/context.js";
import { Pass } from "./gl/pass.js";
import type { Uniforms } from "./gl/program.js";
import type { Texture } from "./gl/texture.js";
import { Vec2, Vec4 } from "./gl/vec.js";
import type { GLRect } from "./gl-rect.js";

/**
 * Copies a source texture to the current framebuffer with premultiplied
 * alpha blending. Used after rendering an element's backbuffer into
 * the canvas/post-effect RT.
 * @internal
 */
export class CopyPass {
    pass: Pass;
    uniforms: Uniforms;

    constructor(ctx: GLContext) {
        this.uniforms = {
            src: { value: null },
            offset: { value: new Vec2() },
            resolution: { value: new Vec2() },
            viewport: { value: new Vec4() },
        };
        this.pass = new Pass(
            ctx,
            DEFAULT_VERTEX_SHADER,
            COPY_FRAGMENT_SHADER,
            this.uniforms,
            "premultiplied",
        );
    }

    setUniforms(tex: Texture, pixelRatio: number, xywh: GLRect): void {
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
