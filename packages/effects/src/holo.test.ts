import { expect, test, vi } from "vitest";
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
    expect(v["grain.amount"]).toBe(0.07); // the port's default (holospot's is 0.18)
});

test("grain and glare take holo.spot's units", () => {
    const v = new HoloEffect({ grain: 0.18, glare: 0.05 }).resolvedSettings();
    expect(v["grain.amount"]).toBe(0.18);
    expect(v["grain.on"]).toBe(true);
    expect(v["display.glare"]).toBe(0.05);
    const off = new HoloEffect({ grain: 0 }).resolvedSettings();
    expect(off["grain.on"]).toBe(false);
});

test("typed params map to holo.spot's settings, clamped to its ranges", () => {
    const v = new HoloEffect({
        tiltRange: 80,
        wobble: false,
        wobbleAmp: 40,
        pose: { x: 50, y: -50 },
        bow: 3,
        lens: 10,
    }).resolvedSettings();
    expect(v["motion.tiltRange"]).toBe(35);
    expect(v["motion.wobble"]).toBe(false);
    expect(v["motion.wobbleAmp"]).toBe(25);
    expect(v["motion.pose"]).toEqual({ x: 35, y: -35 });
    expect(v["card.bow"]).toBe(2);
    expect(v["dof.lens"]).toBe(24);
});

test("looks carry the quality holospot ships them with; msaa is on by default", () => {
    expect(HoloEffect.looks.card.quality).toBe("medium");
    expect(HoloEffect.looks.object.quality).toBe("low");
    expect(HoloEffect.looks.image.quality).toBe("medium");
    expect(new HoloEffect().params.quality).toBe("medium");
    expect(new HoloEffect().config.msaa).toBe(true);
});

test("the config comes last and setParams takes params or a config, told apart by their keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fx = new HoloEffect(
        HoloEffect.looks.card,
        { material: "shatter", exposure: 1 },
        { flat: true, sourceChannel: "luminance" },
    );
    expect(fx.params.material).toBe("shatter");
    expect(fx.params.settings["display.ev"]).toBe(1);
    expect(fx.config).toEqual({
        sizeMm: null,
        sourceChannel: "luminance",
        ink: 0,
        flat: true,
        msaa: true,
    });
    expect("flat" in fx.params).toBe(false);
    fx.setParams({ ink: 0.5 });
    fx.setParams({ material: "nebula" });
    expect(fx.config.ink).toBe(0.5);
    expect(fx.config.flat).toBe(true);
    expect(fx.params.material).toBe("nebula");
    expect(warn).not.toHaveBeenCalled();
    // a param in a config is ignored, with a warning
    // @ts-expect-error: params and config are separate arguments
    fx.setParams({ flat: false, material: "vortex" });
    expect(fx.params.material).toBe("nebula");
    expect(fx.config.flat).toBe(false);
    expect(
        warn.mock.calls.some((c) => String(c[0]).includes('"material"')),
    ).toBe(true);
    warn.mockRestore();
});

test("an unknown param warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // @ts-expect-error: not a param
    new HoloEffect({ mask: "luma" });
    expect(
        warn.mock.calls.some((c) =>
            String(c[0]).includes('unknown param "mask"'),
        ),
    ).toBe(true);
    warn.mockRestore();
});

// types only: the config can only be the last argument
() => {
    // @ts-expect-error: the config comes last
    new HoloEffect({ flat: true }, { exposure: 1 });
    new HoloEffect({ exposure: 1 }, { flat: true });
    new HoloEffect({ flat: true });
};

test("scene shorthands write settings ids: later values win, whichever way they are written", () => {
    const fx = new HoloEffect({
        material: "prism",
        settings: { "prism.pitch": 1200, "display.ev": 2 },
        exposure: -1,
        grain: 0,
        studio: "spot",
    });
    const v = fx.resolvedSettings();
    expect(v["prism.pitch"]).toBe(1200);
    expect(v["display.ev"]).toBe(-1); // in one input, the shorthand wins
    expect(v["grain.on"]).toBe(false);
    expect(v["studio.panel.on"]).toBe(false); // the spot rig
    expect(fx.params.settings["display.ev"]).toBe(-1);
    fx.setParams({ settings: { "display.ev": 1.5 } });
    expect(fx.resolvedSettings()["display.ev"]).toBe(1.5); // later settings win over the earlier shorthand
    fx.setParams({ exposure: null });
    expect(fx.resolvedSettings()["display.ev"]).toBe(0.5); // removed: holo.spot's default
    fx.setParams({}, { resetSettings: true });
    expect(fx.params.settings).toEqual({});
});

test("a light rig goes over the look's lights; single lights given later win", () => {
    // as holospot: the look's values, then the rig's
    const want = resolveSettings("prism", "card", {
        "studio.preset": "softbox",
    }).values;
    const v = new HoloEffect(HoloEffect.looks.card, {
        studio: "softbox",
    }).resolvedSettings();
    for (const [id, x] of Object.entries(want)) {
        expect(close(v[id], x), id).toBe(true);
    }
    const softbox = new HoloEffect({ studio: "softbox" }).resolvedSettings();
    const w = new HoloEffect(
        { settings: { "studio.ambient.fill": 0.5 } },
        { studio: "softbox" },
        { settings: { "studio.ambient.rims": 0.3 } },
    ).resolvedSettings();
    expect(w["studio.ambient.fill"]).toBe(softbox["studio.ambient.fill"]); // before the rig: replaced
    expect(w["studio.ambient.rims"]).toBe(0.3); // after: wins
});

test("a Copy settings blob brings its material and pose, and later settings merge into it", () => {
    const blob = {
        holoDev: 1 as const,
        entity: "card",
        material: "shatter",
        values: { "shatter.size": 3, "display.ev": 1.5, "object.scene": "x" },
        pose: { rx: -8, ry: 12 },
    };
    const fx = new HoloEffect(
        { settings: blob },
        { settings: { "display.glare": 0.05 } },
    );
    const v = fx.resolvedSettings();
    expect(fx.params.material).toBe("shatter");
    expect(v["shatter.size"]).toBe(3);
    expect(v["display.ev"]).toBe(1.5);
    expect(v["display.glare"]).toBe(0.05);
    expect(v["motion.pose"]).toEqual({ x: 12, y: -8 });
    fx.setParams({ settings: { "display.ev": -1 } });
    expect(fx.resolvedSettings()["display.ev"]).toBe(-1);
    expect(
        new HoloEffect({ material: "prism", settings: blob }).params.material,
    ).toBe("prism");
});

test("settings are checked: clamped to holo.spot's ranges, bad values and unknown ids warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const v = new HoloEffect({
        settings: {
            "display.ev": 9,
            "display.tone": "sepia",
            "prism.picth": 1,
        } as never,
        background: "#fff",
    }).resolvedSettings();
    expect(v["display.ev"]).toBe(3);
    expect(v["display.tone"]).toBe("neutral");
    expect(v["scene.background"]).toBe("colour");
    expect(v["scene.bgColor"]).toBe("#ffffff");
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => m.includes("display.ev"))).toBe(true);
    expect(msgs.some((m) => m.includes("display.tone"))).toBe(true);
    expect(
        msgs.some((m) => m.includes("unknown holo.spot setting prism.picth")),
    ).toBe(true);
    warn.mockClear();
    new HoloEffect({
        settings: { "bump.strength": 0.78, "scene.wall": "x" } as never,
    }).resolvedSettings();
    expect(warn).not.toHaveBeenCalled(); // holospot's default of an unported id, a site-only id
    new HoloEffect({
        settings: { "dof.on": true } as never,
    }).resolvedSettings();
    expect(warn.mock.calls.some((c) => String(c[0]).includes("dof.on"))).toBe(
        true,
    );
    warn.mockRestore();
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

test("looks.image is the emboss paper card", () => {
    const p = HoloEffect.looks.image;
    expect(p.material).toBe("emboss");
    const got = new HoloEffect({ ...p }).resolvedSettings();
    const want = resolveSettings("emboss", "card", {});
    for (const [id, v] of Object.entries(want.values)) {
        expect(close(got[id], v), id).toBe(true);
    }
});

test("startingPoints: every id is a setting of its material or the scene", () => {
    let n = 0;
    for (const [m, ps] of Object.entries(HoloEffect.startingPoints)) {
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
        HoloEffect.startingPoints.prism.compactDisc,
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

test("emboss.logo takes a URL or an image, kept by reference; none by default", () => {
    expect(
        new HoloEffect({ material: "emboss" }).resolvedSettings()[
            "emboss.logo"
        ],
    ).toBe("");
    const img = { width: 10, height: 10 } as unknown as HTMLCanvasElement;
    const v = new HoloEffect({
        material: "emboss",
        settings: { "emboss.logo": img },
    }).resolvedSettings();
    expect(v["emboss.logo"]).toBe(img);
});

test("the emboss logo's placement is CSS px: unset by default, mm from a holo.spot blob dropped", () => {
    const v = new HoloEffect({ material: "emboss" }).resolvedSettings();
    expect(v["emboss.x"]).toBeUndefined(); // centred, 36/63 of the width
    expect(v["emboss.width"]).toBeUndefined();
    const placed = new HoloEffect({
        material: "emboss",
        settings: { "emboss.x": 80, "emboss.width": 400 },
    }).resolvedSettings();
    expect(placed["emboss.x"]).toBe(80);
    expect(placed["emboss.width"]).toBe(400); // no mm range
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fromBlob = new HoloEffect({
        settings: {
            holoDev: 1,
            material: "emboss",
            values: {
                "emboss.x": 20,
                "emboss.width": 36,
                "emboss.foil": "gold",
            },
        },
    }).resolvedSettings();
    expect(fromBlob["emboss.x"]).toBeUndefined();
    expect(fromBlob["emboss.foil"]).toBe("gold");
    expect(warn.mock.calls.some((c) => String(c[0]).includes("emboss.x"))).toBe(
        true,
    );
    warn.mockRestore();
});

test("emboss: the element as the logo, its threshold, and an own print", () => {
    const img = { width: 10, height: 10 } as unknown as HTMLCanvasElement;
    const v = new HoloEffect({
        material: "emboss",
        settings: { "emboss.logo": "element", "emboss.print": img },
    }).resolvedSettings();
    expect(v["emboss.logo"]).toBe("element");
    expect(v["emboss.print"]).toBe(img);
    expect(v["emboss.threshold"]).toBe(0.5); // the port's: holospot cuts at ½
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = new HoloEffect({
        material: "emboss",
        settings: { "emboss.threshold": 2 },
    }).resolvedSettings();
    expect(t["emboss.threshold"]).toBe(0.99);
    warn.mockRestore();
});

test("a Copy settings blob's holo.spot images are ignored with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const v = new HoloEffect({
        settings: {
            holoDev: 1,
            material: "emboss",
            values: {
                "emboss.logo": "/logos/koru.svg",
                "emboss.print": "asset:print-1",
                "emboss.foil": "gold",
            },
        },
    }).resolvedSettings();
    expect(v["emboss.logo"]).toBe(""); // no logo, not a fetch of /logos/koru.svg
    expect(v["emboss.print"]).toBe("");
    expect(v["emboss.foil"]).toBe("gold");
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => m.includes("/logos/koru.svg"))).toBe(true);
    expect(msgs.some((m) => m.includes("asset:print-1"))).toBe(true);
    warn.mockRestore();
});

test("a Copy settings blob of holo.spot's cloth, stickers or flag warns, and a card's does not", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const blob = (entity: string) =>
        new HoloEffect({
            settings: { holoDev: 1, entity, material: "prism", values: {} },
        }).resolvedSettings();
    blob("card");
    blob("object");
    expect(warn).not.toHaveBeenCalled();
    blob("flag");
    expect(
        warn.mock.calls.some((c) =>
            String(c[0]).includes('"flag" object is drawn as a flat card'),
        ),
    ).toBe(true);
    warn.mockRestore();
});
