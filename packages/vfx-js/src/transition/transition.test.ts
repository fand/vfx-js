import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Effect, EffectContext, EffectDims } from "../types";
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
            ease: "smoothstep",
        });
    });

    test("transition uniforms are defaults under the spec's", () => {
        const cube: TransitionDef = {
            name: "cube",
            frag: "",
            uniforms: { persp: 0.7, unzoom: 0.3 },
        };
        expect(resolveSpec({ transition: cube }).uniforms).toEqual({
            persp: 0.7,
            unzoom: 0.3,
        });
        expect(
            resolveSpec({}, { transition: cube, uniforms: { persp: 0.2 } })
                .uniforms,
        ).toEqual({ persp: 0.2, unzoom: 0.3 });
    });

    test("carries the transition's ease", () => {
        const linear: TransitionDef = { name: "l", frag: "", ease: "linear" };
        expect(resolveSpec({ transition: linear }).ease).toBe("linear");
    });

    test("overflow from the options wins over the transition's", () => {
        const wide: TransitionDef = { name: "wide", frag: "", overflow: 20 };
        const full: TransitionDef = { name: "full", frag: "", overflow: true };
        expect(resolveSpec({ transition: wide }).overflow).toBe(20);
        expect(resolveSpec({ transition: wide, overflow: 10 }).overflow).toBe(
            10,
        );
        expect(resolveSpec({ transition: wide, overflow: 50 }).overflow).toBe(
            50,
        );
        expect(
            resolveSpec({ transition: wide }, { overflow: true }).overflow,
        ).toBe(true);
        expect(resolveSpec({ transition: full, overflow: 5 }).overflow).toBe(5);
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

    test("a run spec without a shader takes the back type's shader", () => {
        const opts = {
            transition: swipe,
            duration: 1,
            types: { back: { transition: zoom, duration: 2 } },
        };
        expect(
            resolveSpec(opts, { type: "back", duration: 0.3 }),
        ).toMatchObject({ transition: zoom, duration: 0.3 });
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

    test("is undefined when the element fills the canvas", () => {
        const fullDims = {
            ...dims,
            contentRect: [-10, -20, 400, 300],
        } as unknown as EffectDims;
        expect(start(true).outputRect(fullDims)).toBeUndefined();
        expect(start(5).outputRect(fullDims)).toBeUndefined();
    });

    test("shrinks back while taking a snapshot", () => {
        const effect = start(true);
        void effect.snapshot();
        expect(effect.outputRect(dims)).toBeUndefined();
    });
});

describe("TransitionEffect frames", () => {
    const frameCtx = (time: number) =>
        ({
            time,
            deltaTime: 0.1,
            src: {},
            target: null,
            dims: { elementPixel: [10, 10] },
            draw: vi.fn(),
            blit: vi.fn(),
            createRenderTarget: () => ({ dispose: () => {} }),
        }) as unknown as EffectContext;

    const run = (ease?: "smoothstep" | "linear") => {
        const effect = new TransitionEffect();
        void effect.snapshot();
        effect.render(frameCtx(0));
        const frames: [number, number][] = [];
        void effect.start({
            frag: "",
            duration: 1,
            reverse: false,
            ease,
            onFrame: (t, x) => frames.push([t, x]),
        });
        effect.render(frameCtx(10));
        const ctx = frameCtx(10.25);
        effect.render(ctx);
        const draw = vi.mocked(ctx.draw).mock.calls[0][0];
        return { frames, t: draw.uniforms?.t };
    };

    test("eases t with a smoothstep by default", () => {
        const { frames, t } = run();
        expect(frames[1]).toEqual([0.15625, 0.25]);
        expect(t).toBe(0.15625);
    });

    test("a linear transition gets t equal to x", () => {
        const { frames, t } = run("linear");
        expect(frames[1]).toEqual([0.25, 0.25]);
        expect(t).toBe(0.25);
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

function fakeMedia(
    tagName: string,
    ready: boolean,
    extra: { loading?: string; preload?: string; top?: number } = {},
) {
    const listeners = new Map<string, () => void>();
    const top = extra.top ?? 0;
    return {
        tagName,
        complete: ready,
        readyState: ready ? 4 : 0,
        loading: extra.loading ?? "eager",
        preload: extra.preload ?? "auto",
        getBoundingClientRect: () => ({
            left: 0,
            top,
            right: 100,
            bottom: top + 100,
        }),
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
        vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
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

    test("skips lazy images off screen and preload none videos", async () => {
        const done = vi.fn();
        waitForMedia(
            fakeRoot([
                fakeMedia("IMG", false, { loading: "lazy", top: 2000 }),
                fakeMedia("VIDEO", false, { preload: "none" }),
            ]),
            undefined,
        ).then(done);
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toHaveBeenCalled();
    });

    test("waits for lazy images on screen", async () => {
        const img = fakeMedia("IMG", false, { loading: "lazy", top: 100 });
        const done = vi.fn();
        waitForMedia(fakeRoot([img]), undefined).then(done);
        await vi.advanceTimersByTimeAsync(0);
        expect(done).not.toHaveBeenCalled();
        img.fire("load");
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toHaveBeenCalled();
    });

    test("gives up after 300 ms by default", async () => {
        const done = vi.fn();
        waitForMedia(fakeRoot([]), new Promise(() => {})).then(done);
        await vi.advanceTimersByTimeAsync(299);
        expect(done).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
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

function setup(
    opts: {
        keepWrapped?: boolean;
        snapshotStalls?: boolean;
        captureTimesOut?: boolean;
    } = {},
) {
    const {
        snapshotStalls = false,
        captureTimesOut = false,
        ...transitionOpts
    } = opts;
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
        snapshot: () => {
            end();
            log.push("snapshot");
            return snapshotStalls
                ? new Promise<void>(() => {})
                : Promise.resolve();
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
    let chain: Effect[] = [];
    const disposed: Effect[] = [];
    const toList = (effects: Effect | readonly Effect[] | undefined) =>
        effects === undefined ? [] : [effects].flat();
    const vfx: TransitionHost = {
        addHTMLWithStill: async (_element, props) => {
            log.push("wrap");
            chain = toList(props.effect);
        },
        update: async () => {
            log.push("update");
        },
        updateInTime: async () => {
            log.push("update");
            return !captureTimesOut;
        },
        updateEffects: async (_element, effects) => {
            log.push("updateEffects");
            const next = toList(effects);
            disposed.push(...chain.filter((e) => !next.includes(e)));
            chain = next;
        },
        remove: () => {
            log.push("unwrap");
            disposed.push(...chain);
            chain = [];
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
        forceRender: () => {
            log.push("forceRender");
            return () => {
                log.push("unforceRender");
            };
        },
    };
    const element = {} as HTMLElement;
    const onDestroy = vi.fn();
    const transition = new TransitionController(
        vfx,
        element,
        { waitFor: "none", ...transitionOpts },
        onDestroy,
        effect,
    );
    return {
        transition,
        log,
        starts,
        onDestroy,
        disposed,
        chain: () => chain,
    };
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
            "forceRender",
            "snapshot",
            "cb",
            "freeze",
            "update",
            "start",
            "unwrap",
            "unfreeze",
            "unfreeze",
            "unlock",
            "unforceRender",
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

    test("a snapshot that never lands times out and cuts", async () => {
        vi.useFakeTimers();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const { transition, log, starts } = setup({ snapshotStalls: true });
            const cb = vi.fn();
            const run = transition.run(cb);
            await vi.advanceTimersByTimeAsync(999);
            expect(cb).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(1);
            await run;
            expect(cb).toHaveBeenCalledOnce();
            expect(starts).toHaveLength(0);
            expect(log).toContain("cancel");
            expect(log).toContain("unwrap");
            expect(log).toContain("unforceRender");
            expect(transition.running).toBe(false);
            expect(warn).toHaveBeenCalledOnce();
        } finally {
            warn.mockRestore();
            vi.useRealTimers();
        }
    });

    test("a transition that never ends times out and unwraps", async () => {
        vi.useFakeTimers();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const { transition, log } = setup();
            const cb = vi.fn();
            const run = transition.run(cb, { duration: 0.5 });
            await vi.advanceTimersByTimeAsync(1499);
            expect(log).not.toContain("unwrap");
            await vi.advanceTimersByTimeAsync(10);
            await run;
            expect(cb).toHaveBeenCalledOnce();
            expect(log).toContain("unwrap");
            expect(warn).toHaveBeenCalledOnce();
        } finally {
            warn.mockRestore();
            vi.useRealTimers();
        }
    });

    const driverDef = (name: string) => {
        const created: Effect[][] = [];
        const def: TransitionDef = {
            name,
            frag: "",
            effects: async () => {
                const fx = [{ render: () => {} }];
                created.push(fx);
                return fx;
            },
        };
        return { def, created };
    };

    test("a new def swaps the driver effects in the chain", async () => {
        const { transition, starts, chain, disposed } = setup({
            keepWrapped: true,
        });
        const a = driverDef("a");
        const b = driverDef("b");
        for (const [i, def] of [a.def, b.def, a.def].entries()) {
            const run = transition.run(() => {}, { transition: def });
            await settle();
            starts[i].end();
            await run;
        }
        expect(chain()).toHaveLength(2);
        expect(chain()[1]).toBe(a.created[1][0]);
        expect(disposed).toEqual([a.created[0][0], b.created[0][0]]);
    });

    test("a fresh def per run keeps the chain length", async () => {
        const { transition, starts, chain, disposed } = setup({
            keepWrapped: true,
        });
        for (let i = 0; i < 3; i++) {
            const run = transition.run(() => {}, {
                transition: driverDef(`fresh${i}`).def,
            });
            await settle();
            starts[i].end();
            await run;
            expect(chain()).toHaveLength(2);
        }
        expect(disposed).toHaveLength(2);
    });

    test("driver effects of a dropped run stay out of the chain", async () => {
        const { transition, starts, chain } = setup({ keepWrapped: true });
        let resolveA: (fx: Effect[]) => void = () => {};
        const slowFx = [{ render: () => {} }];
        const slow: TransitionDef = {
            name: "slow",
            frag: "",
            effects: () =>
                new Promise<Effect[]>((resolve) => {
                    resolveA = resolve;
                }),
        };
        const b = driverDef("b");
        const runA = transition.run(() => {}, { transition: slow });
        const runB = transition.run(() => {}, { transition: b.def });
        resolveA(slowFx);
        await runA;
        await settle();
        starts[0].end();
        await runB;
        expect(chain()).toEqual([expect.anything(), b.created[0][0]]);
        expect(chain()).not.toContain(slowFx[0]);
    });

    test("warns once when the new content is not captured in time", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const { transition, starts } = setup({ captureTimesOut: true });
            for (let i = 0; i < 2; i++) {
                const run = transition.run(() => {});
                await settle();
                starts[i].end();
                await run;
            }
            expect(starts).toHaveLength(2);
            expect(warn).toHaveBeenCalledOnce();
        } finally {
            warn.mockRestore();
        }
    });

    test("duration 0 cuts without wrapping", async () => {
        const { transition, log } = setup();
        const cb = vi.fn();
        await transition.run(cb, { duration: 0 });
        expect(cb).toHaveBeenCalledOnce();
        expect(log).not.toContain("wrap");
    });

    test("lazy opts resolve after cb and bind the def then", async () => {
        const { def } = driverDef("lazy");
        def.frag = "/* lazy */";
        const prepare = vi.fn();
        def.prepare = prepare;
        const { transition, log, starts, chain } = setup();
        const run = transition.run(
            () => {
                log.push("cb");
            },
            () => {
                log.push("resolveOpts");
                return { transition: def };
            },
        );
        await settle();
        starts[0].end();
        await run;
        const order = [
            "snapshot",
            "cb",
            "resolveOpts",
            "updateEffects",
            "start",
        ];
        expect(log.filter((s) => order.includes(s))).toEqual(order);
        expect(log.indexOf("wrap")).toBeLessThan(log.indexOf("snapshot"));
        expect(prepare).toHaveBeenCalledOnce();
        expect(starts[0].opts.frag).toContain("/* lazy */");
        expect(chain()).toEqual([]);
    });

    test("lazy opts without driver effects keep the chain", async () => {
        const { transition, log, starts } = setup();
        const run = transition.run(
            () => {},
            () => ({ transition: swipe }),
        );
        await settle();
        starts[0].end();
        await run;
        expect(log).not.toContain("updateEffects");
        expect(starts[0].opts.name).toBe("swipe");
    });

    test("lazy duration 0 cuts after cb and unwraps", async () => {
        const { transition, log, starts } = setup();
        const cb = vi.fn(() => {
            log.push("cb");
        });
        await transition.run(cb, () => ({ duration: 0 }));
        expect(cb).toHaveBeenCalledOnce();
        expect(starts).toHaveLength(0);
        expect(log.indexOf("snapshot")).toBeLessThan(log.indexOf("cb"));
        expect(log.indexOf("cb")).toBeLessThan(log.indexOf("cancel"));
        expect(log).toContain("unwrap");
        expect(transition.running).toBe(false);
    });

    test("lazy opts that throw reject the run and unwrap", async () => {
        const { transition, log, starts } = setup();
        const cb = vi.fn();
        const err = new Error("nope");
        await expect(
            transition.run(cb, () => {
                throw err;
            }),
        ).rejects.toBe(err);
        expect(cb).toHaveBeenCalledOnce();
        expect(starts).toHaveLength(0);
        expect(log).toContain("cancel");
        expect(log).toContain("unwrap");
        expect(transition.running).toBe(false);
    });
});
