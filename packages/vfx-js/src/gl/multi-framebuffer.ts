import type { BackendTargetGroup } from "../backend.js";
import type { GLContext, Restorable } from "./context.js";
import type { Framebuffer } from "./framebuffer.js";

/**
 * One FBO that draws to the color attachments of several framebuffers.
 * Members stay owned by the caller.
 * @internal
 */
export class MultiFramebuffer implements BackendTargetGroup, Restorable {
    gl: WebGL2RenderingContext;
    fbo: WebGLFramebuffer;
    readonly members: readonly Framebuffer[];

    #ctx: GLContext;
    #depthSource: Framebuffer | null;
    #memberVersions: number[] = [];
    #depthVersion = -1;

    constructor(
        ctx: GLContext,
        members: readonly Framebuffer[],
        depthSource: Framebuffer | null,
    ) {
        this.#ctx = ctx;
        this.gl = ctx.gl;
        this.members = members;
        this.#depthSource = depthSource;
        this.fbo = this.#createFbo();
        this.#bindAndAttach();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        ctx.addResource(this);
    }

    get width(): number {
        return this.members[0].width;
    }

    get height(): number {
        return this.members[0].height;
    }

    /** Bind to FRAMEBUFFER, attaching again if a member was reallocated. */
    bind(): void {
        if (this.#isStale()) {
            this.#bindAndAttach();
            return;
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    }

    restore(): void {
        this.fbo = this.#createFbo();
        this.#bindAndAttach();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    dispose(): void {
        this.#ctx.removeResource(this);
        this.gl.deleteFramebuffer(this.fbo);
    }

    #createFbo(): WebGLFramebuffer {
        const fbo = this.gl.createFramebuffer();
        if (!fbo) {
            throw new Error("[VFX-JS] Failed to create framebuffer");
        }
        return fbo;
    }

    #isStale(): boolean {
        if (
            this.#depthSource &&
            this.#depthSource.version !== this.#depthVersion
        ) {
            return true;
        }
        return this.members.some(
            (member, i) => member.version !== this.#memberVersions[i],
        );
    }

    #bindAndAttach(): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        const drawBuffers: number[] = [];
        this.members.forEach((member, i) => {
            member.attachColorTo(i);
            drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
        });
        this.#depthSource?.attachDepthTo();
        gl.drawBuffers(drawBuffers);
        this.#memberVersions = this.members.map((member) => member.version);
        this.#depthVersion = this.#depthSource?.version ?? -1;
    }
}
