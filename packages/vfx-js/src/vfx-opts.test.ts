import { describe, expect, test } from "vitest";
import { getVFXOpts } from "./types";

describe("getVFXOpts: timeScale", () => {
    test("defaults to 1", () => {
        expect(getVFXOpts({}).timeScale).toBe(1);
    });

    test("passes through explicit values, including 0 and negatives", () => {
        expect(getVFXOpts({ timeScale: 2 }).timeScale).toBe(2);
        expect(getVFXOpts({ timeScale: 0 }).timeScale).toBe(0);
        expect(getVFXOpts({ timeScale: -1 }).timeScale).toBe(-1);
    });
});
