import { describe, expect, test } from "vitest";
import { computeLights } from "./scene/lights.js";
import { isCopyBlob, resolveSettings, sceneStateFrom } from "./settings.js";

describe("resolveSettings", () => {
    test("card look of prism carries holo.spot's shipped values and pose", () => {
        const r = resolveSettings("prism", "card", {});
        expect(r.values["prism.pitch"]).toBe(1765);
        expect(r.values["prism.pattern"]).toBe("concentric");
        expect(r.pose).toEqual({ rx: -20.5, ry: -25 });
    });

    test("plain look uses parameter defaults", () => {
        const r = resolveSettings("prism", "plain", {});
        expect(r.values["prism.pitch"]).toBe(1000);
        expect(r.values["display.ev"]).toBe(0.5);
        expect(r.pose).toEqual({ rx: 0, ry: 0 });
    });

    test("given values win over the studio preset, which wins over the look", () => {
        const r = resolveSettings("prism", "card", {
            "studio.preset": "spot",
            "studio.spotA.radiance": 10,
        });
        expect(r.values["studio.panel.on"]).toBe(false);
        expect(r.values["studio.spotA.radiance"]).toBe(10);
    });

    test("ids of other materials are ignored; motion.pose overrides the pose", () => {
        const r = resolveSettings("prism", "card", {
            "nebula.size": 10,
            "motion.pose": { x: 3, y: 4 },
        });
        expect(r.values["nebula.size"]).toBeUndefined();
        expect(r.pose).toEqual({ rx: 4, ry: 3 });
    });

    test("copy blob detection", () => {
        expect(isCopyBlob({ holoDev: 1, material: "prism", values: {} })).toBe(
            true,
        );
        expect(isCopyBlob({ "prism.pitch": 1 })).toBe(false);
    });
});

test("lights: the studio of the card look has a key light", () => {
    const r = resolveSettings("prism", "card", {});
    const s = sceneStateFrom(r.values);
    const set = computeLights(
        s.studio,
        { mode: "tilt", pad: { x: 0, y: 0 } },
        s.background,
        { x: 0, y: 0, z: 0, w: 1 },
        [0, 0, 0.4],
    );
    expect(set.key).toBeGreaterThanOrEqual(0);
    expect(set.order[0]).toBeGreaterThanOrEqual(0);
});
