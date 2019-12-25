import vProvider from "./provider";
export const VFXProvider = vProvider;

import vImg from "./image";
export const VFXImg = vImg;

import vVideo from "./video";
export const VFXVideo = vVideo;

import vElementFactory from "./element";
export const VFXSpan = vElementFactory<"span">("span");
export const VFXDiv = vElementFactory<"div">("div");
export const VFXP = vElementFactory<"p">("p");
