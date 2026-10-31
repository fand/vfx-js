// drawElementImage returns a DOMMatrix in Chrome < 155 and nothing after.
interface CanvasRenderingContext2D {
    drawElementImage(
        element: Element,
        x: number,
        y: number,
    ): DOMMatrix | undefined;
    drawElementImage(
        element: Element,
        x: number,
        y: number,
        width: number,
        height: number,
    ): DOMMatrix | undefined;
}

interface HTMLCanvasElement {
    requestPaint(): void;
    onpaint: ((ev?: Event) => void) | null;
}
