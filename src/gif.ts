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
    startTime: number; // msec
    playTime = 0;

    static async create(
        src: string,
        width: number,
        height: number
    ): Promise<GIFData> {
        const frames = await fetch(src)
            .then(resp => resp.arrayBuffer())
            .then(buff => new GIF(buff))
            .then(gif => gif.decompressFrames(true));

        return new GIFData(frames as any, width, height);
    }

    private constructor(frames: GIFFrame[], width: number, height: number) {
        this.frames = frames;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d")!;

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
