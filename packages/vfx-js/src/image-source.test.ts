import { describe, expect, it } from "vitest";
import { getImageSourceUrl } from "./image-source.js";

describe("getImageSourceUrl", () => {
    it("prefers currentSrc when present", () => {
        const img = {
            currentSrc: "https://example.com/selected.jpg",
            src: "https://example.com/fallback.jpg",
        } as HTMLImageElement;

        expect(getImageSourceUrl(img)).toBe("https://example.com/selected.jpg");
    });

    it("falls back to src when currentSrc is empty", () => {
        const img = {
            currentSrc: "",
            src: "https://example.com/fallback.jpg",
        } as HTMLImageElement;

        expect(getImageSourceUrl(img)).toBe("https://example.com/fallback.jpg");
    });
});
