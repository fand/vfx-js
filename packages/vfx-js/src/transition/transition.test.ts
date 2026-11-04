import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { EffectDims } from "../types";
import { crossfade } from "./crossfade";
import { TransitionEffect, type TransitionStartOpts } from "./effect";
import { BODY_OFFSET, describeGlslError } from "./glsl";
import {
    resolveSpec,
    TransitionController,
    type TransitionEffectLike,
    type TransitionHost,
    waitForMedia,
} from "./transition";
import type { TransitionDef } from "./types";

const swipe: TransitionDef = { name: "swipe", frag: "" };
const zoom: TransitionDef = { name: "zoom", frag: "" };

describe("resolveSpec", () => {
    test("uses defaults", () => {
        expect(resolveSpec({})).toEqual({
            transition: crossfade,
            uniforms: {},
            reverse: false,
            duration: 0.6,
            overflow: undefined,
        });
    });

    test("overflow is the larger of the transition's and the options'", () => {
        const wide: TransitionDef = { name: "wide", frag: "", overflow: 20 };
        const full: TransitionDef = { name: "full", frag: "", overflow: true };
        expect(resolveSpec({ transition: wide }).overflow).toBe(20);
        expect(resolveSpec({ transition: wide, overflow: 10 }).overflow).toBe(
            20,
        );
        expect(resolveSpec({ transition: wide, overflow: 50 }).overflow).toBe(
            50,
        );
        expect(
            resolveSpec({ transition: wide }, { overflow: true }).overflow,
        ).toBe(true);
        expect(resolveSpec({ transition: full, overflow: 5 }).overflow).toBe(
            true,
        );
        expect(
            resolveSpec(
                {
                    overflow: 5,
                    types: { big: { transition: swipe, overflow: 30 } },
                },
                { type: "big", overflow: 8 },
            ).overflow,
        ).toBe(8);
        expect(
            resolveSpec(
                {
                    overflow: 5,
                    types: { big: { transition: swipe, overflow: 30 } },
                },
                { type: "big" },
            ).overflow,
        ).toBe(30);
    });

    test("run options beat the type, which beats the container", () => {
        const opts = {
            transition: swipe,
            duration: 1,
            types: { back: { transition: zoom, reverse: true } },
        };
        expect(resolveSpec(opts, { type: "back" })).toMatchObject({
            transition: zoom,
            reverse: true,
            duration: 1,
        });
        expect(
            resolveSpec(opts, { type: "back", reverse: false, duration: 2 }),
        ).toMatchObject({ transition: zoom, reverse: false, duration: 2 });
    });

    test("uniforms come from the level that sets the shader", () => {
        const opts = {
            transition: swipe,
            uniforms: { width: 1 },
            types: { back: { transition: zoom, uniforms: { strength: 2 } } },
        };
        expect(resolveSpec(opts, { type: "back" })).toMatchObject({
            transition: zoom,
            uniforms: { strength: 2 },
        });
        expect(
            resolveSpec(opts, { type: "back", transition: crossfade }),
        ).toMatchObject({ transition: crossfade, uniforms: {} });
        expect(resolveSpec(opts, { uniforms: { width: 5 } })).toMatchObject({
            transition: swipe,
            uniforms: { width: 1 },
        });
        expect(resolveSpec({ uniforms: { width: 1 } })).toMatchObject({
            transition: crossfade,
            uniforms: { width: 1 },
        });
    });

    test("unknown type falls back to the container", () => {
        expect(
            resolveSpec({ transition: swipe }, { type: "nope" }).transition,
        ).toBe(swipe);
    });
});

describe("TransitionEffect.outputRect", () => {
    const dims = {
        pixelRatio: 2,
        contentRect: [0, 0, 100, 50],
        canvasRect: [-10, -20, 400, 300],
    } as unknown as EffectDims;
    const start = (overflow?: true | number) => {
        const effect = new TransitionEffect();
        void effect.start({ frag: "", duration: 1, reverse: false, overflow });
        return effect;
    };

    test("is undefined when idle or without overflow", () => {
        expect(new TransitionEffect().outputRect(dims)).toBeUndefined();
        expect(start().outputRect(dims)).toBeUndefined();
    });

    test("covers the canvas for true", () => {
        expect(start(true).outputRect(dims)).toEqual([-10, -20, 400, 300]);
    });

    test("pads by CSS px for a number", () => {
        expect(start(5).outputRect(dims)).toEqual([-10, -10, 120, 70]);
    });

    test("shrinks back while taking a snapshot", () => {
        const effect = start(true);
        void effect.snapshot();
        expect(effect.outputRect(dims)).toBeUndefined();
    });
});

describe("describeGlslError", () => {
    test("maps lines into the body", () => {
        const err = new Error(
            `compile failed\nERROR: 0:${BODY_OFFSET + 3}: '}' : syntax error`,
        );
        expect(describeGlslError(err)).toEqual(["line 3: '}' : syntax error"]);
    });

    test("ignores other errors", () => {
        expect(describeGlslError(new Error("nope"))).toBeNull();
    });
});

function fakeMedia(tagName: string, ready: boolean) {
    const listeners = new Map<string, () => void>();
    return {
        tagName,
        complete: ready,
        readyState: ready ? 4 : 0,
        addEventListener: (type: string, fn: () => void) => {
            listeners.set(type, fn);
        },
        fire: (type: string) => listeners.get(type)?.(),
    };
}

function fakeRoot(media: unknown[]) {
    return { querySelectorAll: () => media } as unknown as ParentNode;
}

describe("waitForMedia", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test("resolves at once with nothing pending", async () => {
        const done = vi.fn();
        waitForMedia(fakeRoot([fakeMedia("IMG", true)]), undefined).then(done);
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toHaveBeenCalled();
    });

    test("waits for images and videos to load or fail", async () => {
        const img = fakeMedia("IMG", false);
        const video = fakeMedia("VIDEO", false);
        const done = vi.fn();
        waitForMedia(fakeRoot([img, video]), undefined).then(done);
        img.fire("load");
        await vi.advanceTimersByTimeAsync(0);
        expect(done).not.toHaveBeenCalled();
        video.fire("error");
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toHaveBeenCalled();
    });

    test("gives up after the timeout", async () => {
        const done = vi.fn();
        waitForMedia(fakeRoot([]), new Promise(() => {}), 1000).then(done);
        await vi.advanceTimersByTimeAsync(999);
        expect(done).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(done).toHaveBeenCalled();
    });
});

function setup(opts: { keepWrapped?: boolean } = {}) {
    const log: string[] = [];
    const starts: { opts: TransitionStartOpts; end: () => void }[] = [];
    let endCurrent: (() => void) | null = null;
    const end = () => {
        const f = endCurrent;
        endCurrent = null;
        f?.();
    };
    const effect: TransitionEffectLike = {
        render: () => {},
        snapshot: async () => {
            end();
            log.push("snapshot");
        },
        start: (startOpts) => {
            end();
            log.push("start");
            return new Promise<void>((resolve) => {
                const finish = () => {
                    startOpts.onEnd?.();
                    resolve();
                };
                endCurrent = finish;
                starts.push({ opts: startOpts, end: finish });
            });
        },
        cancel: () => {
            end();
            log.push("cancel");
        },
    };
    const vfx: TransitionHost = {
        addHTML: async () => {
            log.push("wrap");
        },
        update: async () => {
            log.push("update");
        },
        updateEffects: async () => {
            log.push("updateEffects");
        },
        remove: () => {
            log.push("unwrap");
        },
        freezeInside: () => {
            log.push("freeze");
            return () => {
                log.push("unfreeze");
            };
        },
        lockSize: () => {
            log.push("lock");
            return () => {
                log.push("unlock");
            };
        },
    };
    const element = {} as HTMLElement;
    const onDestroy = vi.fn();
    const transition = new TransitionController(
        vfx,
        element,
        { waitFor: "none", ...opts },
        onDestroy,
        effect,
    );
    return { transition, log, starts, onDestroy };
}

describe("TransitionController", () => {
    beforeEach(() => {
        vi.stubGlobal("requestAnimationFrame", (fn: () => void) =>
            setTimeout(fn, 0),
        );
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const settle = () => new Promise((r) => setTimeout(r, 5));

    test("runs the steps in order and unwraps at the end", async () => {
        const { transition, log, starts } = setup();
        const done = transition.run(() => {
            log.push("cb");
        });
        await settle();
        expect(transition.running).toBe(true);
        starts[0].end();
        await done;
        expect(log).toEqual([
            "freeze",
            "wrap",
            "lock",
            "snapshot",
            "cb",
            "freeze",
            "update",
            "start",
            "unwrap",
            "unfreeze",
            "unfreeze",
            "unlock",
        ]);
        expect(transition.running).toBe(false);
    });

    test("a new run drops the old one, which still applies its change", async () => {
        const { transition, log, starts } = setup();
        const cbA = vi.fn();
        const cbB = vi.fn();
        const runA = transition.run(cbA);
        await settle();
        const runB = transition.run(cbB);
        await runA;
        expect(cbA).toHaveBeenCalledOnce();
        await settle();
        expect(starts).toHaveLength(2);
        starts[1].end();
        await runB;
        expect(cbB).toHaveBeenCalledOnce();
        expect(log.filter((s) => s === "unwrap")).toHaveLength(1);
        expect(log.filter((s) => s === "lock").length).toBe(
            log.filter((s) => s === "unlock").length,
        );
        expect(log.filter((s) => s === "freeze").length).toBe(
            log.filter((s) => s === "unfreeze").length,
        );
    });

    test("a run that is dropped before its snapshot still calls cb", async () => {
        const { transition, starts } = setup();
        const cbA = vi.fn();
        const runA = transition.run(cbA);
        const runB = transition.run(() => {});
        await runA;
        expect(cbA).toHaveBeenCalledOnce();
        await settle();
        starts[0].end();
        await runB;
        expect(starts).toHaveLength(1);
    });

    test("cancel resolves the run and unwraps", async () => {
        const { transition, log } = setup();
        const run = transition.run(() => {});
        await settle();
        transition.cancel();
        await run;
        expect(log).toContain("cancel");
        expect(log).toContain("unfreeze");
        expect(log.filter((s) => s === "lock")).toHaveLength(1);
        expect(log.filter((s) => s === "unlock")).toHaveLength(1);
        expect(log[log.length - 1]).toBe("unwrap");
        expect(transition.running).toBe(false);
    });

    test("keepWrapped wraps once and re-captures later runs", async () => {
        const { transition, log, starts, onDestroy } = setup({
            keepWrapped: true,
        });
        for (let i = 0; i < 2; i++) {
            const run = transition.run(() => {});
            await settle();
            starts[i].end();
            await run;
        }
        expect(log.filter((s) => s === "wrap")).toHaveLength(1);
        expect(log).not.toContain("unwrap");
        transition.destroy();
        expect(log[log.length - 1]).toBe("unwrap");
        expect(onDestroy).toHaveBeenCalledOnce();
    });

    test("driver effects are created once and hooked into the run", async () => {
        const fx = [{ render: () => {} }];
        const effects = vi.fn(async () => fx);
        const prepare = vi.fn();
        const onEnd = vi.fn();
        const def: TransitionDef = {
            name: "driver",
            frag: "",
            effects,
            prepare,
            onEnd,
        };
        const { transition, starts } = setup();
        for (let i = 0; i < 2; i++) {
            const run = transition.run(() => {}, { transition: def });
            await settle();
            starts[i].end();
            await run;
        }
        expect(effects).toHaveBeenCalledOnce();
        expect(prepare).toHaveBeenCalledTimes(2);
        expect(prepare.mock.calls[0][1]).toBe(fx);
        expect(onEnd).toHaveBeenCalledTimes(2);
    });

    test("duration 0 cuts without wrapping", async () => {
        const { transition, log } = setup();
        const cb = vi.fn();
        await transition.run(cb, { duration: 0 });
        expect(cb).toHaveBeenCalledOnce();
        expect(log).not.toContain("wrap");
    });
});
