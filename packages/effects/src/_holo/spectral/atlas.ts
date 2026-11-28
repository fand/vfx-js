// CPU side of the spectral tables on the GPU (holospot engine/scene/spectralTextures.ts, MIT © 2026 Dmitry Kurash),
// re-shaped for vfx-js: the 5 SPD layers of uCmfConv / uCmfCum are stacked into one 2D atlas each
// (512 × 41·5 texels), and both atlases travel as float24 bytes in one canvas image (spectral/float24.ts) that a GPU
// pass decodes into float render targets.
//
// Byte image layout (rows as the GPU sees them, row 0 at the bottom; the canvas is written upside down because
// textures are uploaded with UNPACK_FLIP_Y): width 3·512 (one value per pixel, x = 3·texel + channel), height 2·41·5
// (conv in rows [0, 205), cum in rows [205, 410)).
import { SPD_IDS, type SpdId, type TintInputs } from "../types.js";
import { encodeFloat24 } from "./float24.js";
import { materialFactor } from "./spd.js";
import {
    buildBins,
    buildCmfLayer,
    buildSpecProj,
    CMF_TABLE,
} from "./tables.js";

export const ATLAS = {
    width: CMF_TABLE.width,
    rows: CMF_TABLE.rows,
    layers: CMF_TABLE.layers,
    /** Atlas height in texels (41·5). */
    height: CMF_TABLE.rows * CMF_TABLE.layers,
    /** Byte image size. */
    imageWidth: 3 * CMF_TABLE.width,
    imageHeight: 2 * CMF_TABLE.rows * CMF_TABLE.layers,
} as const;

const CLEAR_TINT: TintInputs = {
    type: "clear",
    edgeNm: 550,
    widthNm: 50,
    floor: 1,
};

function sameTint(a: TintInputs | null, b: TintInputs): boolean {
    if (!a || a.type !== b.type) {
        return false;
    }
    return (
        a.type === "clear" ||
        (a.edgeNm === b.edgeNm &&
            a.widthNm === b.widthNm &&
            a.floor === b.floor)
    );
}

export class SpectralAtlas {
    /** RGBA bytes of the image, row 0 = top (canvas order). */
    readonly bytes = new Uint8ClampedArray(
        ATLAS.imageWidth * ATLAS.imageHeight * 4,
    ).fill(255);
    /** uSpecProj: 5 column-major mat4. */
    readonly specProj = new Float32Array(16 * SPD_IDS.length);
    /** Environment bins for K = 6 and 8 (centres, column-major mat3 weights, width). */
    readonly bins: Record<
        6 | 8,
        { lambda: Float32Array; W: Float32Array; width: number }
    > = {
        6: { lambda: new Float32Array(6), W: new Float32Array(54), width: 50 },
        8: {
            lambda: new Float32Array(8),
            W: new Float32Array(72),
            width: 37.5,
        },
    };
    /** Incremented whenever the bytes change (the GPU copy must be refreshed). */
    version = 0;

    private readonly built = new Set<number>([0]);
    private tint: TintInputs | null = null;
    private rho: (lambdaNm: number) => number = materialFactor(CLEAR_TINT);

    constructor(tint: TintInputs = CLEAR_TINT) {
        this.setTint(tint);
    }

    /** Material tint changed: rebuild every built layer, the projection and the bins (no-op for the same tint). */
    setTint(t: TintInputs): void {
        if (sameTint(this.tint, t)) {
            return;
        }
        this.tint = { ...t };
        this.rho = materialFactor(this.tint);
        SPD_IDS.forEach((id, k) => {
            this.specProj.set(buildSpecProj(id, this.rho), 16 * k);
        });
        for (const K of [6, 8] as const) {
            const b = buildBins(K, this.rho);
            this.bins[K].lambda.set(b.lambda);
            this.bins[K].W.set(b.W);
            this.bins[K].width = b.width;
        }
        for (const layer of this.built) {
            this.buildLayer(layer);
        }
        this.version++;
    }

    /** Builds the layer of an SPD the first time a light selects it. */
    ensureLayer(id: SpdId): void {
        const layer = SPD_IDS.indexOf(id);
        if (layer < 0 || this.built.has(layer)) {
            return;
        }
        this.built.add(layer);
        this.buildLayer(layer);
        this.version++;
    }

    private buildLayer(layer: number): void {
        const { conv, cum } = buildCmfLayer(SPD_IDS[layer], this.rho);
        this.writeRows(conv, layer * ATLAS.rows);
        this.writeRows(cum, ATLAS.height + layer * ATLAS.rows);
    }

    /** Writes a 512 × 41 RGBA float table to GPU rows [row0, row0 + 41). */
    private writeRows(data: Float32Array, row0: number): void {
        const W = ATLAS.width;
        for (let j = 0; j < ATLAS.rows; j++) {
            const canvasRow = ATLAS.imageHeight - 1 - (row0 + j);
            const base = canvasRow * ATLAS.imageWidth * 4;
            for (let i = 0; i < W; i++) {
                for (let c = 0; c < 3; c++) {
                    encodeFloat24(
                        data[(j * W + i) * 4 + c],
                        this.bytes,
                        base + (3 * i + c) * 4,
                    );
                }
            }
        }
    }
}
