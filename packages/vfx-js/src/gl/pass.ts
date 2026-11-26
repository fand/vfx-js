import type { BlendMode, DrawState } from "../backend.js";

/** @internal */
export function applyBlend(gl: WebGL2RenderingContext, mode: BlendMode): void {
    if (mode === "none") {
        gl.disable(gl.BLEND);
        return;
    }
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    if (mode === "premultiplied") {
        gl.blendFuncSeparate(
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
        );
    } else if (mode === "additive") {
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
    } else {
        gl.blendFuncSeparate(
            gl.SRC_ALPHA,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
        );
    }
}

/** @internal */
export function applyDrawState(
    gl: WebGL2RenderingContext,
    state: DrawState,
): void {
    if (state.depthTest || state.depthWrite) {
        gl.enable(gl.DEPTH_TEST);
        // Depth writes need DEPTH_TEST on; ALWAYS lets every fragment pass.
        gl.depthFunc(
            state.depthTest ? depthFuncEnum(gl, state.depthFunc) : gl.ALWAYS,
        );
        gl.depthMask(state.depthWrite);
    } else {
        gl.disable(gl.DEPTH_TEST);
    }
    if (state.cull === "none") {
        gl.disable(gl.CULL_FACE);
    } else {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(state.cull === "front" ? gl.FRONT : gl.BACK);
    }
}

/** Put depth and cull state back to the baseline. @internal */
export function resetDrawState(gl: WebGL2RenderingContext): void {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.depthFunc(gl.LESS);
    gl.cullFace(gl.BACK);
}

function depthFuncEnum(
    gl: WebGL2RenderingContext,
    func: DrawState["depthFunc"],
): number {
    switch (func) {
        case "never":
            return gl.NEVER;
        case "less":
            return gl.LESS;
        case "equal":
            return gl.EQUAL;
        case "lequal":
            return gl.LEQUAL;
        case "greater":
            return gl.GREATER;
        case "notequal":
            return gl.NOTEQUAL;
        case "gequal":
            return gl.GEQUAL;
        case "always":
            return gl.ALWAYS;
    }
}
