interface GIFFrame {
    patch: Uint8ClampedArray;
    dims: {
        width: number;
        height: number;
        left: number;
        top: number;
    };
    delay: number;
}
export default class GIFData {
    frames: GIFFrame[];
    index: number;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    pixelRatio: number;
    startTime: number;
    playTime: number;
    static create(src: string, pixelRatio: number): Promise<GIFData>;
    private constructor();
    getCanvas(): HTMLCanvasElement;
    update(): void;
}
export {};
