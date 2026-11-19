// Quality tiers (holospot engine/render/tier.ts, MIT © 2026 Dmitry Kurash): defines and loop trip counts of the
// material programs. MSAA is the effect's `msaa` flag; DPR caps and memory budgets do not apply to an element effect.
import type { Tier, TierConfig } from "./types.js";

const HIGH_RE =
    /NVIDIA|GeForce|RTX|Quadro|Radeon RX|Radeon Pro|Arc A|Apple M\d|Apple GPU/i;

/** Unmasked renderer string: WEBGL_debug_renderer_info when exposed, else gl.RENDERER. */
function rendererString(gl: WebGL2RenderingContext): string {
    try {
        const ext = gl.getExtension("WEBGL_debug_renderer_info") as {
            UNMASKED_RENDERER_WEBGL: number;
        } | null;
        const s = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
        if (typeof s === "string" && s.length > 0) {
            return s;
        }
    } catch {
        // fall through
    }
    const r = gl.getParameter(gl.RENDERER);
    return typeof r === "string" ? r : "";
}

/** holospot's `quality: "auto"`: low on phones (coarse touch pointer, small screen), high on discrete/Apple GPUs. */
export function detectTier(gl: WebGL2RenderingContext): Tier {
    const coarse =
        typeof matchMedia === "function" &&
        matchMedia("(pointer: coarse)").matches;
    const touch =
        typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    const small =
        typeof screen !== "undefined" &&
        Math.min(screen.width, screen.height) < 900;
    if (coarse && touch && small) {
        return "low";
    }
    return HIGH_RE.test(rendererString(gl)) ? "high" : "medium";
}

export const TIERS: Readonly<Record<Tier, TierConfig>> = {
    high: {
        tier: "high",
        glareLevels: 5,
        glareStartDiv: 2,
        waves: { board: 8, coat: 16 },
        defines: {
            RECT_EXACT: 1,
            RECT_LTC: 1,
            NB: 8,
            IBL_ORDERS: 1,
            DISCRETE_LIGHTS: 4,
            DISCRETE_LIGHTS_B: 2,
            FLAKE_ENV: 1,
            WEAR_CELLS: 3,
        },
        trips: {
            maxOrder: 3,
            ghB: 4,
            vorR: 2,
            flakeR: 1,
            bCells: 3,
            bBins: 5,
            bLevels: 2,
        },
    },
    medium: {
        tier: "medium",
        glareLevels: 4,
        glareStartDiv: 2,
        waves: { board: 6, coat: 8 },
        defines: {
            RECT_EXACT: 1,
            RECT_LTC: 1,
            NB: 6,
            IBL_ORDERS: 1,
            DISCRETE_LIGHTS: 4,
            DISCRETE_LIGHTS_B: 2,
            FLAKE_ENV: 1,
            WEAR_CELLS: 3,
        },
        trips: {
            maxOrder: 2,
            ghB: 4,
            vorR: 2,
            flakeR: 0,
            bCells: 3,
            bBins: 3,
            bLevels: 2,
        },
    },
    low: {
        tier: "low",
        glareLevels: 3,
        glareStartDiv: 4,
        waves: { board: 2, coat: 2 },
        defines: {
            RECT_EXACT: 0,
            RECT_LTC: 0,
            NB: 0,
            IBL_ORDERS: 0,
            DISCRETE_LIGHTS: 2,
            DISCRETE_LIGHTS_B: 1,
            FLAKE_ENV: 0,
            WEAR_CELLS: 2,
        },
        trips: {
            maxOrder: 2,
            ghB: 2,
            vorR: 1,
            flakeR: 0,
            bCells: 2,
            bBins: 2,
            bLevels: 1,
        },
    },
};
