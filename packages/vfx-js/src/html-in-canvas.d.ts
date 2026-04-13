interface CanvasRenderingContext2D {
    drawElementImage(element: Element, x: number, y: number): void;
    drawElementImage(
        element: Element,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void;
}

interface HTMLCanvasElement {
    requestPaint(): void;
    onpaint: (() => void) | null;
}
