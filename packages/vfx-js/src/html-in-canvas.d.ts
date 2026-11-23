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
    // Chrome 157+. Maps a drawable child's border box to the canvas, in
    // CSS px, for hit testing and accessibility.
    updateElementGeometry?(
        element: Element,
        options?: { canvasTransform?: DOMMatrixInit },
    ): void;
}
