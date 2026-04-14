/**
 * This is the list of components exposed by VFX-JS.
 * @module VFX-JS
 */

export * from "./vfx.js";
export * from "./constants.js";
export { supportsHtmlInCanvas } from "./html-in-canvas-support.js";
export { isWebGLAvailable } from "./webgl-support.js";
export { setupCapture, teardownCapture } from "./html-in-canvas.js";
export type { CaptureOpts } from "./html-in-canvas.js";

export type { VFXOpts, VFXProps, VFXPostEffect, VFXPass } from "./types.js";
