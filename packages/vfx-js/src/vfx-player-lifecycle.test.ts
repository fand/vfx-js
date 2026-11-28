// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from "vitest";
import { type Effect, getVFXOpts } from "./types.js";
import { VFXPlayer } from "./vfx-player.js";

const state = vi.hoisted(() => ({
    textures: [] as { source: unknown; dispose: ReturnType<typeof vi.fn> }[],
}));

vi.mock("./gl/context.js", () => ({
    GLContext: class {
        gl = { clearColor: vi.fn() };
        onContextRestored() {}
    },
}));
vi.mock("./gl/quad.js", () => ({
    Quad: class {
        dispose() {}
    },
}));
vi.mock("./program-cache.js", () => ({
    ProgramCache: class {
        dispose() {}
    },
}));
vi.mock("./copy-pass.js", () => ({
    CopyPass: class {
        dispose() {}
    },
}));
vi.mock("./gl/texture.js", () => ({
    Texture: class {
        dispose = vi.fn();
        constructor(
            _ctx: unknown,
            public source: unknown,
        ) {
            state.textures.push(this);
        }
    },
}));
vi.mock("./effect-chain.js", () => ({
    EffectChain: class {
        hitTestPadBuffer = { top: 0, right: 0, bottom: 0, left: 0 };
        constructor(
            _ctx: unknown,
            _quad: unknown,
            _pixelRatio: number,
            public effects: Effect[],
        ) {}
        async initAll() {}
        dispose() {
            for (const effect of this.effects) {
                effect.dispose?.();
            }
        }
    },
}));

afterEach(() => {
    state.textures.length = 0;
    document.body.replaceChildren();
});

test("destroy releases every element chain and source, restoring opacity", async () => {
    const player = new VFXPlayer(
        getVFXOpts({ autoplay: false }),
        document.createElement("canvas"),
    );
    const sources = [0.4, 0.7, 1].map((opacity) => {
        const source = document.createElement("canvas");
        source.style.opacity = String(opacity);
        document.body.append(source);
        return source;
    });
    const effects = sources.map(() => ({
        render: vi.fn(),
        dispose: vi.fn(),
    }));
    for (const [i, source] of sources.entries()) {
        await player.addElement(source, { effect: effects[i] });
        expect(source.style.opacity).toBe("0");
    }

    // Removing one element first must not skip its neighbors or dispose twice.
    player.removeElement(sources[1]);
    player.destroy();

    expect(sources.map((source) => source.style.opacity)).toEqual([
        "0.4",
        "0.7",
        "1",
    ]);
    for (const effect of effects) {
        expect(effect.dispose).toHaveBeenCalledOnce();
    }
    for (const texture of state.textures) {
        expect(texture.dispose).toHaveBeenCalledOnce();
    }
    expect(sources.every((source) => !player.hasElement(source))).toBe(true);
});
