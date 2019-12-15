"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = __importDefault(require("./provider"));
exports.VFXProvider = provider_1.default;
const image_1 = __importDefault(require("./image"));
exports.VFXImg = image_1.default;
const video_1 = __importDefault(require("./video"));
exports.VFXVideo = video_1.default;
const element_1 = __importDefault(require("./element"));
exports.VFXSpan = element_1.default("span");
exports.VFXDiv = element_1.default("div");
exports.VFXP = element_1.default("p");
//# sourceMappingURL=index.js.map