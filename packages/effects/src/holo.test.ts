import { expect, test } from "vitest";
import { resolveSettings } from "./_holo/settings.js";
import { HoloEffect, type HoloMaterial } from "./holo.js";

test("settingSpecs: the material's ids first, then the scene's, none of other materials", () => {
    const specs = HoloEffect.settingSpecs("shatter");
    const ids = specs.map((s) => s.id);
    expect(ids[0].startsWith("shatter.")).toBe(true);
    expect(ids).toContain("display.ev");
    expect(ids.some((id) => id.startsWith("prism."))).toBe(false);
    const size = specs.find((s) => s.id === "shatter.size");
    expect(size).toMatchObject({ kind: "slider" });
    expect(typeof size?.min).toBe("number");
});

test("the default is holo.spot's parameter defaults", () => {
    const v = new HoloEffect().resolvedSettings();
    expect(v["prism.pitch"]).toBe(1000);
    expect(v["prism.pattern"]).toBe("linear");
    expect(v["motion.pose"]).toEqual({ x: 0, y: 0 });
});

test("resolvedSettings: defaults, then settings, then typed params", () => {
    const fx = new HoloEffect({
        material: "prism",
        settings: { "prism.pitch": 1200, "display.ev": 2 },
        exposure: -1,
        grain: 0,
        lights: "spot",
    });
    const v = fx.resolvedSettings();
    expect(v["prism.pitch"]).toBe(1200);
    expect(v["display.ev"]).toBe(-1); // typed param wins over settings
    expect(v["grain.on"]).toBe(false);
    expect(v["studio.panel.on"]).toBe(false); // the spot rig
    fx.setParams({ exposure: null });
    expect(fx.resolvedSettings()["display.ev"]).toBe(2);
});

const close = (a: unknown, b: unknown) =>
    typeof a === "number" && typeof b === "number"
        ? Math.abs(a - b) < 1e-9
        : JSON.stringify(a) === JSON.stringify(b);

test.each([
    ["card", "prism"],
    ["card", "nebula"],
    ["object", "nebula"],
    ["object", "sparkle"],
] as const)(
    "looks.%s with %s resolves as holo.spot's look",
    (look, material) => {
        const fx = new HoloEffect({
            ...HoloEffect.looks[look],
            material: material as HoloMaterial,
        });
        const got = fx.resolvedSettings();
        const want = resolveSettings(material, look, {});
        for (const [id, v] of Object.entries(want.values)) {
            expect(close(got[id], v), id).toBe(true);
        }
        expect(got["motion.pose"]).toEqual({
            x: want.pose.ry,
            y: want.pose.rx,
        });
    },
);

test("looks.paperCard is the emboss paper card", () => {
    const p = HoloEffect.looks.paperCard;
    expect(p.material).toBe("emboss");
    const got = new HoloEffect({ ...p }).resolvedSettings();
    const want = resolveSettings("emboss", "card", {});
    for (const [id, v] of Object.entries(want.values)) {
        expect(close(got[id], v), id).toBe(true);
    }
});
