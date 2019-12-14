"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const html2canvas_1 = __importDefault(require("html2canvas"));
const p_queue_1 = __importDefault(require("p-queue"));
const delay_1 = __importDefault(require("delay"));
const pq = new p_queue_1.default({ concurrency: 1 });
pq.add(() => delay_1.default(0));
function elementToCanvas(element) {
    return pq.add(() => html2canvas_1.default(element, { backgroundColor: null, scale: 2 }));
}
exports.default = elementToCanvas;
//# sourceMappingURL=h2c-queued.js.map