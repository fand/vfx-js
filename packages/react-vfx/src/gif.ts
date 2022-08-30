import GIF from "./gifuct-js";

interface GIFFrame {
    patch: Uint8ClampedArray;
    dims: { width: number; height: number; left: number; top: number };
    delay: number;
}

export default class GIFData {
    frames: GIFFrame[] = [];
    index = 0;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    pixelRatio: number;
    startTime: number; // msec
    playTime = 0;

    static async create(src: string, pixelRatio: number): Promise<GIFData> {
        const gif = await fetch(src)
            .then((resp) => resp.arrayBuffer())
            .then((buff) => new GIF(buff));

        const frames = gif.decompressFrames(true, undefined, undefined);
        const width = (gif.raw as any).lsd.width;
        const height = (gif.raw as any).lsd.height;

        return new GIFData(frames as any, width, height, pixelRatio);
    }

    private constructor(
        frames: GIFFrame[],
        width: number,
        height: number,
        pixelRatio: number
    ) {
        this.frames = frames;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d")!;
        this.pixelRatio = pixelRatio;

        // Override canvas size by image size
        // Because canvas does not support scaling ImageData.
        this.canvas.width = width;
        this.canvas.height = height;

        this.startTime = Date.now();
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public update(): void {
        const now = Date.now();
        const elapsedTime = now - this.startTime;

        while (this.playTime < elapsedTime) {
            const f = this.frames[this.index % this.frames.length];
            this.playTime += f.delay;
            this.index++;
        }
        const frame = this.frames[this.index % this.frames.length];

        const image = new ImageData(
            frame.patch,
            frame.dims.width,
            frame.dims.height
        );

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(image, frame.dims.left, frame.dims.top);
    }
}
