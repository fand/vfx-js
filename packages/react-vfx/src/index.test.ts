import * as VfxReact from "@vfx-js/react";
import { describe, expect, it } from "vitest";
import * as ReactVfx from "./index.js";

describe("react-vfx wrapper", () => {
    it("re-exports every named export of @vfx-js/react", () => {
        const wrapperKeys = Object.keys(ReactVfx).sort();
        const sourceKeys = Object.keys(VfxReact).sort();
        expect(wrapperKeys).toEqual(sourceKeys);
        expect(wrapperKeys.length).toBeGreaterThan(0);
    });

    it("re-exports the same instances (no duplication)", () => {
        const source = VfxReact as Record<string, unknown>;
        const wrapper = ReactVfx as Record<string, unknown>;
        for (const key of Object.keys(source)) {
            expect(wrapper[key]).toBe(source[key]);
        }
    });
});
