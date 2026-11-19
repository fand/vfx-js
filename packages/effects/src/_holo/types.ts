// Shared contracts of the holo port (subset of holospot engine/types.ts).
// Ported from holospot (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.

export type HoloMaterialId =
    | "prism"
    | "shatter"
    | "nebula"
    | "sparkle"
    | "vortex"
    | "emboss";
export type Tier = "low" | "medium" | "high";
export type Background = "black" | "white" | "colour";
export type PointerMode = "tilt" | "light" | "flash";
export type ToneCurve = "neutral" | "agx" | "clamp";
export type SpdId = "equal" | "daylight" | "tungsten" | "led" | "triphosphor";
/** Texture layer order of the spectral tables. */
export const SPD_IDS: readonly SpdId[] = [
    "equal",
    "daylight",
    "tungsten",
    "led",
    "triphosphor",
];
export type TintType = "clear" | "longpass" | "shortpass";

export interface Vec2 {
    x: number;
    y: number;
}
export type Vec3 = readonly [number, number, number];
/** Row-major 3×3 matrix. */
export type Mat3 = readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
];
export interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}

export type ParamValue = number | boolean | string | Vec2;
export type ParamValues = Readonly<Record<string, ParamValue>>;

export interface TintInputs {
    type: TintType;
    edgeNm: number;
    widthNm: number;
    floor: number;
}

/** For CPU etaNorm and the material spectral tables. */
export interface GratingSummary {
    /** 1 family (M1) or 3 (M2 A/B/C; M3 min / mid / max). */
    pitchesNm: readonly number[];
    depthNm: number;
    nc: number;
    /** Grating-vector azimuth at the centre (M1 linear); null = ĝ ∥ q and orientation means. */
    gAzimuthRad: number | null;
    /** TIR and internal-Fresnel recycling (false for M3 flakes). */
    recycle: boolean;
    tint: TintInputs;
    /** Per-family relief depth, same order as pitchesNm. */
    depthsNm?: readonly number[];
}
export interface ReliefInputs {
    seed: number;
    wavinessDeg: number;
    orangePeelUm: number;
}

export interface LightValues {
    on: boolean;
    dir: Vec2;
    radiance: number;
    distanceM: number;
    spd: SpdId;
}
export interface StudioValues {
    panel: LightValues & { widthDeg: number; lengthDeg: number };
    spotA: LightValues & { sizeDeg: number };
    spotB: LightValues & { sizeDeg: number };
    spotC: LightValues & { sizeDeg: number };
    ambient: {
        rims: number;
        fill: number;
        scrim: number;
        cameraSide: number;
        cameraTexture: number;
        backdrop: number;
        rotationDeg: number;
    };
    flash: { sizeMm: number; distanceM: number; radiance: number; spd: SpdId };
}
/** CPU light geometry for one frame (§4.3.1). */
export interface LightSet {
    /** [4] 0 off, 1 sphere, 2 rect */
    type: Int32Array;
    /** [4·3] centres, world m */
    pos: Float32Array;
    /** [4·3] rect half-axes (radial, tangential), world m */
    u: Float32Array;
    w: Float32Array;
    /** [4] sphere radius, m */
    radius: Float32Array;
    /** [4] radiance */
    rad: Float32Array;
    /** [4] SPD layer */
    spd: Int32Array;
    /** [4·3] SPD colour, luminance 1 */
    rgb: Float32Array;
    /** key-light slot (largest irradiance at the centre) or −1 */
    key: number;
    /** [4] slots by hardness (spheres first, then radiance), −1 padded */
    order: Int32Array;
}

export interface TierDefines {
    RECT_EXACT: 0 | 1;
    RECT_LTC: 0 | 1;
    NB: 0 | 6 | 8;
    IBL_ORDERS: 0 | 1;
    DISCRETE_LIGHTS: 2 | 4;
    DISCRETE_LIGHTS_B: 1 | 2;
    FLAKE_ENV: 0 | 1;
    WEAR_CELLS: 2 | 3;
}
export interface TierTrips {
    maxOrder: 2 | 3;
    ghB: 2 | 4;
    vorR: 1 | 2;
    flakeR: 0 | 1;
    bCells: 2 | 3;
    bBins: number;
    bLevels: 1 | 2;
}
export interface TierConfig {
    tier: Tier;
    glareLevels: number;
    glareStartDiv: 2 | 4;
    waves: { board: number; coat: number };
    defines: TierDefines;
    trips: TierTrips;
}
