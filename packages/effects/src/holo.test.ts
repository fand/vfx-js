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

test("presets: every id is a setting of its material or the scene", () => {
    let n = 0;
    for (const [m, ps] of Object.entries(HoloEffect.presets)) {
        const ids = new Set(
            HoloEffect.settingSpecs(m as HoloMaterial).map((s) => s.id),
        );
        for (const p of Object.values(ps)) {
            expect(p.material).toBe(m);
            for (const id of Object.keys(p.settings)) {
                expect(ids.has(id), `${m}: ${id}`).toBe(true);
            }
            n++;
        }
    }
    expect(n).toBeGreaterThanOrEqual(25);
});

test("constructor parts compose: look, then preset, then own values; settings merge by id", () => {
    const fx = new HoloEffect(
        HoloEffect.looks.card,
        HoloEffect.presets.prism.compactDisc,
        { exposure: 1, settings: { "prism.fan": 3 } },
    );
    const v = fx.resolvedSettings();
    expect(fx.params.material).toBe("prism");
    expect(v["prism.pitch"]).toBe(1600); // the preset over the look's 1765
    expect(v["prism.fan"]).toBe(3); // own over the preset's 1.5
    expect(v["display.ev"]).toBe(1);
    // the look's lights survive the preset
    expect(v["studio.panel.dir"]).toEqual(
        HoloEffect.looks.card.settings?.["studio.panel.dir"],
    );
    expect(v["motion.pose"]).toEqual({ x: -25, y: -20.5 });
});

test("flat view: the turned rig meets the card as the turned card meets the rig", async () => {
    const { eulerXYZ } = await import("./_holo/physics/geometry.js");
    const { computeLights } = await import("./_holo/scene/lights.js");
    const { inversePoseQuat } = await import("./_holo/scene/pose.js");
    const { sceneStateFrom, resolveSettings: rs } = await import(
        "./_holo/settings.js"
    );
    const s = sceneStateFrom(rs("prism", "card", {}).values);
    const [rx, ry] = [-20.5, 31];
    const R = eulerXYZ(rx, ry, 0); // row-major
    const still = computeLights(
        s.studio,
        { mode: "tilt", pad: { x: 0, y: 0 } },
        s.background,
        { x: 0, y: 0, z: 0, w: 1 },
        [0, 0, 0.4],
    );
    const turned = computeLights(
        s.studio,
        { mode: "tilt", pad: { x: 0, y: 0 } },
        s.background,
        inversePoseQuat(rx, ry),
        [0, 0, 0.4],
    );
    for (let i = 0; i < 4; i++) {
        if (still.type[i] === 0) {
            continue;
        }
        const P = [0, 1, 2].map((c) => still.pos[3 * i + c]);
        // the light in the turned card's frame: Rᵀ·P
        const local = [0, 1, 2].map(
            (c) => R[c] * P[0] + R[3 + c] * P[1] + R[6 + c] * P[2],
        );
        for (let c = 0; c < 3; c++) {
            expect(turned.pos[3 * i + c]).toBeCloseTo(local[c], 5);
        }
    }
});
