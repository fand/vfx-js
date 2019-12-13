import vProvider from "./provider";
export const VFXProvider = vProvider;

import vImg from "./image";
export const VFXImg = vImg;

import vElementFactory from "./element";
export const VFXSpan = vElementFactory<HTMLSpanElement>("span");
export const VFXDiv = vElementFactory<HTMLDivElement>("div");
export const VFXP = vElementFactory<HTMLParagraphElement>("p");
