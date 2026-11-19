// The textures of Foil Emboss (holospot engine/scene/embossAssets.ts, LogoMaps and PaperMaps, MIT © 2026 Dmitry
// Kurash), re-shaped for vfx-js: the kernels run in an inline worker as in holospot, and their base levels travel as
// float24 byte images (spectral/float24.ts) that the effect decodes into mipmapped float targets. The GPU builds the
// mip chains (box filter, the same 2 × 2 average holospot computes on the CPU; both maps are moments or distances,
// which average linearly).
import { KernelWorker, transferables } from "./scene/kernel-worker.js";
import {
    type LogoBuild,
    logoKernel,
    rasterizeLogo,
    rasterizeLogoImage,
} from "./scene/logo.js";
import {
    PAPER_N,
    PAPER_TILE_MM,
    type PaperBuild,
    paperKernel,
} from "./scene/paper-maps.js";
import { encodeFloat24 } from "./spectral/float24.js";

/** An image the logo can be read from. */
export type LogoImage =
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | OffscreenCanvas;

/** A float RGBA image ready for upload: `bytes` is the canvas image (4 values per texel, one per pixel). */
export interface ByteImage {
    w: number;
    h: number;
    bytes: Uint8ClampedArray<ArrayBuffer>;
}

/** Half float → float. */
function fromHalf(h: number): number {
    const s = h & 0x8000 ? -1 : 1;
    const e = (h >> 10) & 0x1f;
    const m = h & 0x3ff;
    if (e === 0) {
        return s * m * 2 ** -24;
    }
    if (e === 31) {
        return m ? Number.NaN : s * Number.POSITIVE_INFINITY;
    }
    return s * (1 + m / 1024) * 2 ** (e - 15);
}

/** A w × h RGBA half-float level (rows bottom-up) as a byte image for the decode pass (GPU row j = level row j). */
export function byteImageOfHalf(
    data: Uint16Array,
    w: number,
    h: number,
): ByteImage {
    const W = 4 * w;
    const bytes = new Uint8ClampedArray(W * h * 4).fill(255);
    for (let j = 0; j < h; j++) {
        const row = (h - 1 - j) * W * 4;
        for (let i = 0; i < 4 * w; i++) {
            encodeFloat24(fromHalf(data[j * 4 * w + i]), bytes, row + 4 * i);
        }
    }
    return { w, h, bytes };
}

/** The logo source: an image or a URL; "" (or "none") is no logo. */
export type LogoInput = string | LogoImage;

export interface LogoState {
    image: ByteImage;
    /** uLogoMap: texture span in logo widths (x, y), 1/logo width [texels], aspect (height / width). */
    map: [number, number, number, number];
}

export class EmbossAssets {
    private readonly logoWorker = new KernelWorker(logoKernel as never);
    private readonly paperWorker = new KernelWorker(paperKernel as never);
    private logoWanted: LogoInput | null = null;
    private paperWanted = "";
    private logoToken = 0;
    private paperToken = 0;

    /** The logo of the current values, or null (none, still loading, or failed). Changes bump `logoVersion`. */
    logo: LogoState | null = null;
    logoVersion = 0;
    /** The paper maps (moments, aux), or null while they build. Changes bump `paperVersion`. */
    paper: { mom: ByteImage; aux: ByteImage } | null = null;
    paperVersion = 0;
    /** Errors of the current logo and paper requests. */
    get errors(): readonly string[] {
        return [this.logoError, this.paperError].filter(
            (e): e is string => e !== null,
        );
    }
    /** Whether a logo or paper request is still in flight. */
    get busy(): boolean {
        return this.logoBusy || this.paperBusy;
    }
    private logoError: string | null = null;
    private paperError: string | null = null;
    private logoBusy = false;
    private paperBusy = false;

    /** Requests the logo (no-op when unchanged); null, "" or "none" is no logo. */
    setLogo(input: LogoInput | null | undefined): void {
        const want = input ?? "";
        if (want === this.logoWanted) {
            return;
        }
        this.logoWanted = want;
        const token = ++this.logoToken;
        this.logoError = null;
        if (
            typeof want === "string" &&
            (want.trim() === "" || want.trim().toLowerCase() === "none")
        ) {
            this.logoBusy = false;
            this.install(null);
            return;
        }
        this.logoBusy = true;
        void (async () => {
            try {
                const { raster } =
                    typeof want === "string"
                        ? await rasterizeLogo(want.trim())
                        : await rasterizeLogoImage(want);
                if (token !== this.logoToken) {
                    return;
                }
                const b = await this.logoWorker.run<LogoBuild>(
                    "build",
                    raster,
                    transferables(raster),
                );
                if (token !== this.logoToken) {
                    return;
                }
                const l0 = b.levels[0];
                this.install({
                    image: byteImageOfHalf(l0.data, l0.w, l0.h),
                    map: [
                        b.w / b.logoW,
                        b.h / b.logoW,
                        1 / b.logoW,
                        b.logoH / b.logoW,
                    ],
                });
                this.logoBusy = false;
            } catch (e) {
                if (token !== this.logoToken) {
                    return;
                }
                this.logoError = `HoloEffect: could not load the logo${typeof want === "string" ? ` ${want}` : ""}: ${e instanceof Error ? e.message : String(e)}. A cross-origin image needs CORS (and crossOrigin on an <img>).`;
                console.warn(this.logoError);
                this.logoBusy = false;
                this.install(null);
            }
        })();
    }

    private install(l: LogoState | null): void {
        this.logo = l;
        this.logoVersion++;
    }

    /** Requests the paper maps of a stock (no-op when unchanged). */
    setPaper(k: {
        stock: number;
        fibreAmount: number;
        fibreScale: number;
        seed: number;
    }): void {
        const key = `${k.stock}|${k.fibreAmount}|${k.fibreScale}|${k.seed}`;
        if (key === this.paperWanted) {
            return;
        }
        this.paperWanted = key;
        const token = ++this.paperToken;
        this.paperError = null;
        this.paperBusy = true;
        void (async () => {
            try {
                const b = await this.paperWorker.run<PaperBuild>("build", {
                    n: PAPER_N,
                    tileMm: PAPER_TILE_MM,
                    ...k,
                });
                if (token !== this.paperToken) {
                    return;
                }
                const l0 = b.levels[0];
                this.paper = {
                    mom: byteImageOfHalf(l0.mom, l0.w, l0.h),
                    aux: byteImageOfHalf(l0.aux, l0.w, l0.h),
                };
                this.paperVersion++;
                this.paperBusy = false;
            } catch (e) {
                if (token === this.paperToken) {
                    this.paperError = `HoloEffect: could not build the paper maps: ${e instanceof Error ? e.message : String(e)}`;
                    console.warn(this.paperError);
                    this.paperBusy = false;
                }
            }
        })();
    }

    dispose(): void {
        this.logoToken++;
        this.paperToken++;
        this.logoWorker.dispose();
        this.paperWorker.dispose();
    }
}
