import type { TransitionDef } from "@vfx-js/core";
import { describe, expect, it } from "vitest";
import { resolveRunOpts } from "./scope.js";

const swipe: TransitionDef = { name: "swipe", frag: "" };
const zoom: TransitionDef = { name: "zoom", frag: "" };

describe("resolveRunOpts", () => {
    it("is empty with nothing set", () => {
        expect(resolveRunOpts(null, null)).toEqual({});
    });

    it("takes the page spec", () => {
        expect(resolveRunOpts(null, { transition: zoom })).toEqual({
            transition: zoom,
        });
    });

    it("a click spec wins whole over the page", () => {
        expect(
            resolveRunOpts(
                { transition: swipe },
                { transition: zoom, duration: 2 },
            ),
        ).toEqual({ transition: swipe });
    });
});
