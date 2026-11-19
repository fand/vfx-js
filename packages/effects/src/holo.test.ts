import { expect, test } from "vitest";
import { HoloEffect } from "./holo.js";

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

test("resolvedSettings: look, then settings, then typed params", () => {
    const fx = new HoloEffect({
        material: "prism",
        look: "card",
        settings: { "prism.pitch": 1200, "display.ev": 2 },
        exposure: -1,
        grain: 0,
        lights: "spot",
    });
    const v = fx.resolvedSettings();
    expect(v["prism.pitch"]).toBe(1200);
    expect(v["prism.pattern"]).toBe("concentric"); // from the card look
    expect(v["display.ev"]).toBe(-1); // typed param wins over settings
    expect(v["grain.on"]).toBe(false);
    expect(v["studio.panel.on"]).toBe(false); // the spot rig
    fx.setParams({ exposure: null });
    expect(fx.resolvedSettings()["display.ev"]).toBe(2);
});
