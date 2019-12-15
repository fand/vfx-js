"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gifuct_js_1 = __importDefault(require("./gifuct-js"));
class GIFData {
    constructor(frames, width, height) {
        this.frames = [];
        this.index = 0;
        this.playTime = 0;
        this.frames = frames;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = width;
        this.canvas.height = height;
        this.startTime = Date.now();
    }
    static create(src, width, height) {
        return __awaiter(this, void 0, void 0, function* () {
            const frames = yield fetch(src)
                .then(resp => resp.arrayBuffer())
                .then(buff => new gifuct_js_1.default(buff))
                .then(gif => gif.decompressFrames(true));
            return new GIFData(frames, width, height);
        });
    }
    getCanvas() {
        return this.canvas;
    }
    update() {
        const now = Date.now();
        const elapsedTime = now - this.startTime;
        while (this.playTime < elapsedTime) {
            const f = this.frames[this.index % this.frames.length];
            this.playTime += f.delay;
            this.index++;
        }
        const frame = this.frames[this.index % this.frames.length];
        const image = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(image, frame.dims.left, frame.dims.top);
    }
}
exports.default = GIFData;
//# sourceMappingURL=gif.js.map