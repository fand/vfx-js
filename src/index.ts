export { VFXProvider } from "./provider";
export { VFXImg } from "./image";
export { VFXVideo } from "./video";

import vElementFactory from "./element";
export const VFXSpan = vElementFactory<"span">("span");
export const VFXDiv = vElementFactory<"div">("div");
export const VFXP = vElementFactory<"p">("p");
