import * as html2canvas from "html2canvas";
import PQueue from "p-queue";
import delay from "delay";

const pq = new PQueue({ concurrency: 1 });

// Avoid confliction with react-three-fiber initialization
pq.add(() => delay(0));

// Schedule html2canvas using queue
// because html2canvas can't be run in parallel
export default function elementToCanvas(
    element: HTMLElement
): Promise<HTMLCanvasElement> {
    return pq.add(() => html2canvas(element, { backgroundColor: null }));
}
