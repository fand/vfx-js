export { VFXCanvas } from "./canvas.js";
export { VFXContext } from "./context.js";
export { VFXImg } from "./image.js";
export { VFXProvider } from "./provider.js";
export { VFXVideo } from "./video.js";

import { VFXElementFactory } from "./element.js";
export const VFXSpan = VFXElementFactory<"span">("span");
export const VFXDiv = VFXElementFactory<"div">("div");
export const VFXP = VFXElementFactory<"p">("p");

export * from "./hooks.js";

export { watchNavigationDirection } from "./transition/direction.js";
export {
    markBackNavigation,
    setNextTransition,
    takePending,
    transition,
} from "./transition/store.js";
export {
    type UseVFXTransition,
    useVFXTransition,
} from "./transition/useVFXTransition.js";
export { VFXLink, type VFXLinkProps } from "./transition/VFXLink.js";
export {
    VFXTransition,
    type VFXTransitionProps,
} from "./transition/VFXTransition.js";
