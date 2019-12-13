"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const html2canvas = require("html2canvas");
const p_queue_1 = require("p-queue");
const delay_1 = require("delay");
const pq = new p_queue_1.default({ concurrency: 1 });
pq.add(() => delay_1.default(0));
function elementToCanvas(element) {
    return pq.add(() => html2canvas(element));
}
exports.default = elementToCanvas;
//# sourceMappingURL=h2c-queued.js.map