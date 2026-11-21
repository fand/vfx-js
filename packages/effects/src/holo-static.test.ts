import { expect, test } from "vitest";
import { loadedMaterial, MATERIAL_NAMES } from "./_holo/materials/registry.js";
import { HoloEffect } from "./holo-static.js";

test("the static entry has every material built in", () => {
    for (const m of MATERIAL_NAMES) {
        expect(loadedMaterial(m), m).toBeDefined();
    }
    expect(new HoloEffect({ material: "sparkle" }).params.material).toBe(
        "sparkle",
    );
});
