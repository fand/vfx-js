import * as html2canvas from "html2canvas";
import PQueue from "p-queue";
import delay from "delay";

const pq = new PQueue({ concurrency: 1 });
pq.add(() => delay(0));

export default function elementToCanvas(
    element: HTMLElement
): Promise<HTMLCanvasElement> {
    return pq.add(() => html2canvas(element));
}
