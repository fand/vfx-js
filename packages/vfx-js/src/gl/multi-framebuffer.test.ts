import { describe, expect, it, vi } from "vitest";
import type { GLContext } from "./context.js";
import type { Framebuffer } from "./framebuffer.js";
import { MultiFramebuffer } from "./multi-framebuffer.js";

function makeMockGl() {
    let fboSeq = 0;
    return {
        FRAMEBUFFER: 0x8d40,
        COLOR_ATTACHMENT0: 0x8ce0,
        createFramebuffer: vi.fn<() => { _fbo: number } | null>(() => ({
            _fbo: ++fboSeq,
        })),
        deleteFramebuffer: vi.fn(),
        bindFramebuffer: vi.fn(),
        drawBuffers: vi.fn(),
    };
}

function makeCtx(gl: ReturnType<typeof makeMockGl>): GLContext {
    return {
        gl,
        addResource: vi.fn(),
        removeResource: vi.fn(),
    } as unknown as GLContext;
}

/** Stands in for a Framebuffer; `setSize` bumps `version` like the real one. */
function makeMember(width = 16, height = 16) {
    const member = {
        width,
        height,
        version: 1,
        attachColorTo: vi.fn(),
        attachDepthTo: vi.fn(),
        setSize(w: number, h: number) {
            member.width = w;
            member.height = h;
            member.version++;
        },
        dispose: vi.fn(),
    };
    return member;
}

function asFramebuffers(
    members: ReturnType<typeof makeMember>[],
): Framebuffer[] {
    return members as unknown as Framebuffer[];
}

describe("MultiFramebuffer", () => {
    it("attaches each member and sets the draw buffers", () => {
        const gl = makeMockGl();
        const members = [
            makeMember(32, 8),
            makeMember(32, 8),
            makeMember(32, 8),
        ];
        const multi = new MultiFramebuffer(
            makeCtx(gl),
            asFramebuffers(members),
            null,
        );
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(
            gl.FRAMEBUFFER,
            multi.fbo,
        );
        members.forEach((member, i) => {
            expect(member.attachColorTo).toHaveBeenCalledExactlyOnceWith(i);
            expect(member.attachDepthTo).not.toHaveBeenCalled();
        });
        expect(gl.drawBuffers).toHaveBeenCalledExactlyOnceWith([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT0 + 1,
            gl.COLOR_ATTACHMENT0 + 2,
        ]);
        expect(multi.width).toBe(32);
        expect(multi.height).toBe(8);
        // Leaves no FBO bound after construction.
        expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
            gl.FRAMEBUFFER,
            null,
        );
    });

    it("attaches the depth source", () => {
        const gl = makeMockGl();
        const members = [makeMember(), makeMember()];
        new MultiFramebuffer(
            makeCtx(gl),
            asFramebuffers(members),
            asFramebuffers(members)[1],
        );
        expect(members[0].attachDepthTo).not.toHaveBeenCalled();
        expect(members[1].attachDepthTo).toHaveBeenCalledOnce();
    });

    it("registers with the context", () => {
        const gl = makeMockGl();
        const ctx = makeCtx(gl);
        const multi = new MultiFramebuffer(
            ctx,
            asFramebuffers([makeMember()]),
            null,
        );
        expect(ctx.addResource).toHaveBeenCalledWith(multi);
    });

    it("bind() does not attach again when versions are unchanged", () => {
        const gl = makeMockGl();
        const members = [makeMember(), makeMember()];
        const multi = new MultiFramebuffer(
            makeCtx(gl),
            asFramebuffers(members),
            null,
        );
        multi.bind();
        multi.bind();
        for (const member of members) {
            expect(member.attachColorTo).toHaveBeenCalledOnce();
        }
        expect(gl.drawBuffers).toHaveBeenCalledOnce();
        expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
            gl.FRAMEBUFFER,
            multi.fbo,
        );
    });

    it("bind() attaches again after a member resizes", () => {
        const gl = makeMockGl();
        const members = [makeMember(), makeMember()];
        const multi = new MultiFramebuffer(
            makeCtx(gl),
            asFramebuffers(members),
            asFramebuffers(members)[0],
        );
        members[1].setSize(32, 32);
        multi.bind();
        expect(members[0].attachColorTo).toHaveBeenCalledTimes(2);
        expect(members[1].attachColorTo).toHaveBeenCalledTimes(2);
        expect(members[0].attachDepthTo).toHaveBeenCalledTimes(2);
        expect(gl.drawBuffers).toHaveBeenCalledTimes(2);
        expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
            gl.FRAMEBUFFER,
            multi.fbo,
        );
        multi.bind();
        expect(members[0].attachColorTo).toHaveBeenCalledTimes(2);
    });

    it("bind() attaches again when only the depth source changes", () => {
        const gl = makeMockGl();
        const member = makeMember();
        const depthSource = makeMember();
        const multi = new MultiFramebuffer(
            makeCtx(gl),
            asFramebuffers([member]),
            asFramebuffers([depthSource])[0],
        );
        depthSource.setSize(32, 32);
        multi.bind();
        expect(depthSource.attachDepthTo).toHaveBeenCalledTimes(2);
        expect(member.attachColorTo).toHaveBeenCalledTimes(2);
    });

    it("restore() creates a new FBO and attaches again", () => {
        const gl = makeMockGl();
        const members = [makeMember(), makeMember()];
        const multi = new MultiFramebuffer(
            makeCtx(gl),
            asFramebuffers(members),
            asFramebuffers(members)[0],
        );
        const oldFbo = multi.fbo;
        multi.restore();
        expect(multi.fbo).not.toBe(oldFbo);
        expect(gl.deleteFramebuffer).not.toHaveBeenCalled();
        expect(gl.bindFramebuffer).toHaveBeenCalledWith(
            gl.FRAMEBUFFER,
            multi.fbo,
        );
        expect(members[1].attachColorTo).toHaveBeenLastCalledWith(1);
        expect(members[0].attachDepthTo).toHaveBeenCalledTimes(2);
        expect(gl.drawBuffers).toHaveBeenCalledTimes(2);
    });

    it("dispose() deletes only its own FBO and unregisters", () => {
        const gl = makeMockGl();
        const ctx = makeCtx(gl);
        const members = [makeMember(), makeMember()];
        const multi = new MultiFramebuffer(ctx, asFramebuffers(members), null);
        multi.dispose();
        expect(gl.deleteFramebuffer).toHaveBeenCalledExactlyOnceWith(multi.fbo);
        expect(ctx.removeResource).toHaveBeenCalledWith(multi);
        for (const member of members) {
            expect(member.dispose).not.toHaveBeenCalled();
        }
    });

    it("throws when the FBO can't be created", () => {
        const gl = makeMockGl();
        gl.createFramebuffer.mockReturnValueOnce(null);
        expect(
            () =>
                new MultiFramebuffer(
                    makeCtx(gl),
                    asFramebuffers([makeMember()]),
                    null,
                ),
        ).toThrow("[VFX-JS] Failed to create framebuffer");
    });
});
