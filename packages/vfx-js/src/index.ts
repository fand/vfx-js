/**
 * This is the list of components exposed by VFX-JS.
 * @module VFX-JS
 */

export * from "./constants.js";
export { isHicCanvas, markHicCanvas } from "./hic-canvas.js";
export type { CaptureOpts } from "./html-in-canvas.js";
export { setupCapture, teardownCapture } from "./html-in-canvas.js";
export { supportsHtmlInCanvas } from "./html-in-canvas-support.js";
export { crossfade } from "./transition/crossfade.js";
export { shaderTransition } from "./transition/shader.js";
export type {
    AddTransitionOpts,
    RunOpts,
    ShaderTransitionDef,
    ShaderTransitionOpts,
    Transition,
    TransitionDef,
    TransitionEase,
    TransitionEffect,
    TransitionEffectContext,
    TransitionProgress,
    TransitionRun,
    TransitionSpec,
    TransitionUniforms,
    TransitionWaitFor,
} from "./transition/types.js";
export type {
    Effect,
    EffectAttributeDescriptor,
    EffectAttributeTypedArray,
    EffectBlitOpts,
    EffectContext,
    EffectDims,
    EffectDrawOpts,
    EffectGeometry,
    EffectQuad,
    EffectRenderTarget,
    EffectRenderTargetOpts,
    EffectTexture,
    EffectTextureFilter,
    EffectTextureSource,
    EffectTextureWrap,
    EffectUniforms,
    EffectUniformValue,
    EffectVFXProps,
    GlslVersion,
    VFXOpts,
    VFXPass,
    VFXPostEffect,
    VFXProps,
} from "./types.js";
export * from "./vfx.js";
