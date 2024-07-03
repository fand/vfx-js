export { VFXProvider } from "./provider.js";
export { VFXImg } from "./image.js";
export { VFXVideo } from "./video.js";

import vElementFactory from "./element.js";
export const VFXSpan = vElementFactory<"span">("span");
export const VFXDiv = vElementFactory<"div">("div");
export const VFXP = vElementFactory<"p">("p");

export * from "./hooks.js";
