import { afterEach, describe, expect, test, vi } from "vitest";
import { prefersReducedMotion } from "./reduced-motion";
import { VFX } from "./vfx";

const playerCalls: string[] = [];

vi.mock("./webgl-support.js", () => ({ isWebGLAvailable: () => true }));
vi.mock("./vfx-player.js", () => ({
    VFXPlayer: class {
        play() {
            playerCalls.push("play");
        }
        render() {
            playerCalls.push("render");
        }
        addElement() {
            playerCalls.push("addElement");
        }
        updateElementEffects() {
            playerCalls.push("updateElementEffects");
        }
    },
}));

function createVFX() {
    const canvas = { style: { setProperty: () => {} } };
    vi.stubGlobal("document", {
        createElement: () => canvas,
        body: { appendChild: () => {} },
    });
    return new VFX();
}

function mockMatchMedia(matches: boolean) {
    vi.stubGlobal("window", {
        matchMedia: (query: string) => ({ matches, media: query }),
    });
}

describe("prefers-reduced-motion", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        playerCalls.length = 0;
    });

    test("prefersReducedMotion follows the media query", () => {
        mockMatchMedia(true);
        expect(prefersReducedMotion()).toBe(true);
        mockMatchMedia(false);
        expect(prefersReducedMotion()).toBe(false);
    });

    test("prefersReducedMotion is false without matchMedia", () => {
        vi.stubGlobal("window", {});
        expect(prefersReducedMotion()).toBe(false);
    });

    test("VFX does nothing", async () => {
        mockMatchMedia(true);
        const vfx = createVFX();
        expect(vfx.reducedMotion).toBe(true);
        expect(playerCalls).toEqual([]);
        vfx.play();
        vfx.render();
        await vfx.add({} as HTMLElement, { shader: "rainbow" });
        await vfx.addHTML({} as HTMLElement, { shader: "rainbow" });
        await vfx.updateEffects({} as HTMLElement, []);
        expect(playerCalls).toEqual([]);
    });

    test("VFX plays without reduced motion", () => {
        mockMatchMedia(false);
        const vfx = createVFX();
        expect(vfx.reducedMotion).toBe(false);
        expect(playerCalls).toEqual(["play"]);
    });
});
