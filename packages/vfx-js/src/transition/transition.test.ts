import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
    Effect,
    EffectContext,
    EffectDims,
    EffectRenderTarget,
    EffectTexture,
} from "../types";
import { Crossfade } from "./crossfade";
import {
    type TransitionFrameSource,
    TransitionSlot,
    TransitionStage,
    type TransitionStartOpts,
} from "./effect";
import { BODY_OFFSET, describeGlslError } from "./glsl";
import { createHistorySpecs, type HistorySpecs } from "./history";
import type { LiveFromLike } from "./live-from";
import { ShaderTransition } from "./shader";
import {
    layerSpec,
    resolveSpec,
    sameParams,
    TransitionController,
    type TransitionHost,
    type TransitionStageLike,
    waitForMedia,
} from "./transition";
import type {
    AddTransitionOpts,
    Transition,
    TransitionEase,
    TransitionEffectContext,
    TransitionRun,
} from "./types";
import type { UATransitions } from "./ua-transition";

const shaderClass = (
    name: string,
    frag = "",
    own: { ease?: TransitionEase; overflow?: true | number } = {},
) =>
    class extends ShaderTransition<Record<string, number>> {
        readonly name = name;
        readonly frag = frag;
        ease = own.ease;
        overflow = own.overflow;
    };

const Swipe = shaderClass("swipe");
const Zoom = shaderClass("zoom");

describe("resolveSpec", () => {
    test("uses defaults", () => {
        expect(resolveSpec({})).toEqual({
            transition: Crossfade,
            params: undefined,
            reverse: false,
            duration: 0.6,
            overflow: undefined,
            ease: undefined,
            liveFrom: false,
        });
    });

    test("ease and overflow: run beats the container", () => {
        const cubic = (x: number) => x * x * x;
        const opts = { transition: Swipe, ease: cubic, overflow: 10 };
        expect(
            resolveSpec(opts, { ease: "linear", overflow: true }),
        ).toMatchObject({ ease: "linear", overflow: true });
        expect(resolveSpec(opts)).toMatchObject({ ease: cubic, overflow: 10 });
    });

    test("run options beat the container per field", () => {
        const opts = { transition: Swipe, duration: 1, reverse: true };
        expect(resolveSpec(opts, { transition: Zoom })).toMatchObject({
            transition: Zoom,
            reverse: true,
            duration: 1,
        });
        expect(
            resolveSpec(opts, { reverse: false, duration: 2 }),
        ).toMatchObject({ transition: Swipe, reverse: false, duration: 2 });
    });

    test("run params without a transition win over the container's", () => {
        const opts = { transition: Swipe, params: { width: 1, soft: 2 } };
        expect(resolveSpec(opts, { params: { width: 5 } })).toMatchObject({
            transition: Swipe,
            params: { width: 5, soft: 2 },
        });
        expect(resolveSpec({ params: { width: 1 } })).toMatchObject({
            transition: Crossfade,
            params: { width: 1 },
        });
    });

    test("a run that sets transition drops the container's params", () => {
        const opts = { transition: Swipe, params: { width: 1 } };
        expect(resolveSpec(opts, { transition: Zoom }).params).toBeUndefined();
        expect(
            resolveSpec(opts, { transition: Zoom, params: { strength: 2 } })
                .params,
        ).toEqual({ strength: 2 });
    });
});

describe("layerSpec", () => {
    test("puts the top over the base per field", () => {
        expect(
            layerSpec(
                { transition: Swipe, duration: 1, reverse: true },
                { duration: 2 },
            ),
        ).toMatchObject({ transition: Swipe, duration: 2, reverse: true });
    });

    test("merges params unless the top sets a transition", () => {
        const base = { transition: Swipe, params: { width: 1, soft: 2 } };
        expect(layerSpec(base, { params: { width: 5 } }).params).toEqual({
            width: 5,
            soft: 2,
        });
        expect(layerSpec(base, { transition: Zoom }).params).toBeUndefined();
    });
});

describe("sameParams", () => {
    test("compares shallowly and arrays by item", () => {
        expect(sameParams({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
        expect(sameParams(undefined, {})).toBe(true);
        expect(sameParams({ a: 1 }, { a: 2 })).toBe(false);
        expect(sameParams({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
        expect(sameParams({ a: 1 }, { a: 1, b: 1 })).toBe(false);
        expect(sameParams({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
    });
});

const run: TransitionRun = { reverse: false, duration: 1 };

describe("ShaderTransition outputRect", () => {
    const dims = {
        pixelRatio: 2,
        contentRect: [0, 0, 100, 50],
        canvasRect: [-10, -20, 400, 300],
    } as unknown as EffectDims;
    const start = (
        ownOverflow?: true | number,
        runOverflow?: true | number,
    ) => {
        const Class = shaderClass("s", "", { overflow: ownOverflow });
        const effect = new Class();
        effect.start(
            runOverflow === undefined ? run : { ...run, overflow: runOverflow },
        );
        return effect;
    };

    test("is undefined without overflow", () => {
        expect(start().outputRect(dims)).toBeUndefined();
    });

    test("covers the canvas for true", () => {
        expect(start(true).outputRect(dims)).toEqual([-10, -20, 400, 300]);
    });

    test("pads by CSS px for a number", () => {
        expect(start(5).outputRect(dims)).toEqual([-10, -10, 120, 70]);
    });

    test("the run's overflow wins over the transition's", () => {
        expect(start(20, 5).outputRect(dims)).toEqual([-10, -10, 120, 70]);
        expect(start(5, true).outputRect(dims)).toEqual([-10, -20, 400, 300]);
    });

    test("is undefined when the element fills the canvas", () => {
        const fullDims = {
            ...dims,
            contentRect: [-10, -20, 400, 300],
        } as unknown as EffectDims;
        expect(start(true).outputRect(fullDims)).toBeUndefined();
        expect(start(5).outputRect(fullDims)).toBeUndefined();
    });
});

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

describe("TransitionStage", () => {
    const play = (ease?: TransitionEase) => {
        const stage = new TransitionStage();
        void stage.snapshot();
        stage.render(frameCtx(0));
        const held = stage.frame;
        void stage.start({ duration: 1, ease });
        stage.update(frameCtx(10));
        stage.update(frameCtx(10.25));
        return { stage, held };
    };

    test("holds the snapshot with zero progress before the start", () => {
        const { held } = play();
        expect(held).toMatchObject({
            progress: { t: 0, x: 0 },
            holding: true,
        });
    });

    test("is disabled while playing, so the live capture flows on", () => {
        const { stage } = play();
        expect(stage.enabled).toBe(false);
        expect(stage.frame?.holding).toBe(false);
    });

    test("eases t with a smoothstep by default", () => {
        expect(play().stage.frame?.progress).toEqual({ t: 0.15625, x: 0.25 });
    });

    test("a linear ease gives t equal to x", () => {
        expect(play("linear").stage.frame?.progress).toEqual({
            t: 0.25,
            x: 0.25,
        });
    });

    test("a function ease gets x in 0..1", () => {
        const seen: number[] = [];
        const { stage } = play((x) => {
            seen.push(x);
            return x * x;
        });
        expect(stage.frame?.progress).toEqual({ t: 0.0625, x: 0.25 });
        expect(seen.every((x) => x >= 0 && x <= 1)).toBe(true);
    });

    test("cut ends the playing run at once", async () => {
        const stage = new TransitionStage();
        void stage.snapshot();
        stage.render(frameCtx(0));
        const onEnd = vi.fn();
        const ended = stage.start({ duration: 1, onEnd });
        stage.update(frameCtx(10));
        stage.cut();
        await ended;
        expect(onEnd).toHaveBeenCalledOnce();
        expect(stage.frame).toBeNull();
    });

    test("ends once the duration has passed", async () => {
        const stage = new TransitionStage();
        void stage.snapshot();
        stage.render(frameCtx(0));
        const onEnd = vi.fn();
        const ended = stage.start({ duration: 1, onEnd });
        stage.update(frameCtx(10));
        stage.update(frameCtx(11));
        await ended;
        expect(onEnd).toHaveBeenCalledOnce();
        expect(stage.frame).toBeNull();
    });

    describe("live source", () => {
        const texture = { __brand: "EffectTexture" } as EffectTexture;

        test("uses the snapshot until the first live frame", () => {
            const stage = new TransitionStage();
            void stage.snapshot();
            stage.render(frameCtx(0));
            stage.setLiveSource(() => null);
            const ctx = frameCtx(1);
            stage.render(ctx);
            const from = stage.frame?.from;
            expect(ctx.blit).toHaveBeenCalledOnce();
            expect(ctx.blit).toHaveBeenCalledWith(from);
        });

        test("copies the live frame into from while holding", () => {
            const stage = new TransitionStage();
            void stage.snapshot();
            stage.render(frameCtx(0));
            stage.setLiveSource(() => texture);
            const ctx = frameCtx(1);
            stage.render(ctx);
            const from = stage.frame?.from;
            expect(vi.mocked(ctx.blit).mock.calls).toEqual([
                [texture, from],
                [from],
            ]);
        });

        test("updates from every frame and stays enabled while playing", () => {
            const stage = new TransitionStage();
            void stage.snapshot();
            stage.render(frameCtx(0));
            let live: EffectTexture | null = null;
            stage.setLiveSource(() => live);
            void stage.start({ duration: 1 });
            expect(stage.enabled).toBe(true);
            const from = stage.frame?.from;
            for (const time of [10, 10.1, 10.2]) {
                stage.update(frameCtx(time));
                const ctx = frameCtx(time);
                stage.render(ctx);
                const calls = vi.mocked(ctx.blit).mock.calls;
                expect(calls).toEqual(
                    live ? [[live, from], [ctx.src]] : [[ctx.src]],
                );
                expect(stage.enabled).toBe(true);
                live = texture;
            }
            expect(stage.frame?.from).toBe(from);
        });

        test("no source goes back to passing the capture through", () => {
            const stage = new TransitionStage();
            void stage.snapshot();
            stage.render(frameCtx(0));
            stage.setLiveSource(() => texture);
            void stage.start({ duration: 1 });
            stage.setLiveSource(null);
            const ctx = frameCtx(10);
            stage.render(ctx);
            expect(vi.mocked(ctx.blit).mock.calls).toEqual([[ctx.src]]);
            expect(stage.enabled).toBe(false);
        });

        test("cancel and a new snapshot drop the source", () => {
            const source = vi.fn(() => texture);
            const stage = new TransitionStage();
            void stage.snapshot();
            stage.render(frameCtx(0));
            stage.setLiveSource(source);
            stage.cancel();
            stage.render(frameCtx(1));
            stage.setLiveSource(source);
            void stage.snapshot();
            stage.render(frameCtx(2));
            expect(source).not.toHaveBeenCalled();
        });
    });
});

describe("TransitionSlot", () => {
    const from = { dispose: () => {} } as unknown as EffectRenderTarget;
    const source = (holding: boolean, t = 0.5): TransitionFrameSource => ({
        frame: { from, progress: { t, x: 0.25 }, holding },
        cut: vi.fn(),
    });

    test("is skipped outside a run", () => {
        const slot = new TransitionSlot({ render: vi.fn() }, source(false));
        expect(slot.enabled).toBe(false);
        slot.start(run);
        expect(slot.enabled).toBe(true);
        slot.end();
        expect(slot.enabled).toBe(false);
    });

    test("passes the run state on the context", () => {
        const render = vi.fn();
        const update = vi.fn();
        const slot = new TransitionSlot({ render, update }, source(false));
        slot.start({ ...run, reverse: true });
        slot.update(frameCtx(0));
        slot.render(frameCtx(0));
        const ctx: TransitionEffectContext = render.mock.calls[0][0];
        expect(ctx.from).toBe(from);
        expect(ctx.progress).toEqual({ t: 0.5, x: 0.25 });
        expect(ctx.reverse).toBe(true);
        expect(ctx.run).toEqual({ ...run, reverse: true });
        expect(ctx.time).toBe(0);
        expect(update).toHaveBeenCalledOnce();
    });

    test("renders but does not update while the old content is held", () => {
        const render = vi.fn();
        const update = vi.fn();
        const slot = new TransitionSlot({ render, update }, source(true));
        slot.start(run);
        slot.update(frameCtx(0));
        slot.render(frameCtx(0));
        expect(update).not.toHaveBeenCalled();
        expect(render).toHaveBeenCalledOnce();
    });

    test("passes the input through once the run has ended", () => {
        const render = vi.fn();
        const slot = new TransitionSlot({ render }, source(false));
        const ctx = frameCtx(0);
        slot.render(ctx);
        expect(render).not.toHaveBeenCalled();
        expect(ctx.blit).toHaveBeenCalledWith(ctx.src);
    });
});

describe("ShaderTransition", () => {
    const ctxOf = (t: number, holding = false) =>
        ({
            ...frameCtx(0),
            gl: {},
            from: {},
            progress: { t, x: 0.25 },
            holding,
            reverse: false,
            run,
            cut: vi.fn(),
        }) as unknown as TransitionEffectContext;

    test("shows the plain snapshot while holding", () => {
        const Class = shaderClass("h");
        const ctx = ctxOf(0, true);
        new Class().render(ctx);
        expect(ctx.draw).not.toHaveBeenCalled();
        expect(ctx.blit).toHaveBeenCalledWith(ctx.src);
    });

    test("draws with the eased t and the uniforms from params", () => {
        class Scaled extends ShaderTransition<{ scale: number }> {
            readonly name = "scaled";
            readonly frag = "/* body */";
            uniforms() {
                return { scale: this.params.scale * 2 };
            }
        }
        const effect = new Scaled({ scale: 3 });
        const ctx = ctxOf(0.3);
        effect.render(ctx);
        const draw = vi.mocked(ctx.draw).mock.calls[0][0];
        expect(draw.frag).toContain("/* body */");
        expect(draw.uniforms).toMatchObject({ scale: 6, t: 0.3 });
        effect.params = { scale: 1 };
        effect.render(ctx);
        expect(vi.mocked(ctx.draw).mock.calls[1][0].uniforms).toMatchObject({
            scale: 2,
        });
    });

    test("instances with the same body share one shader string", () => {
        const Class = shaderClass("shared", "/* shared */");
        const ctx = ctxOf(0.3);
        new Class().render(ctx);
        new Class().render(ctx);
        const [first, second] = vi.mocked(ctx.draw).mock.calls;
        expect(first[0].frag).toBe(second[0].frag);
    });

    test("a shader that fails to compile logs once and cuts the run", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
        try {
            const Bad = shaderClass("bad", "/* bad */");
            const ctx = ctxOf(0.3);
            vi.mocked(ctx.draw).mockImplementation(() => {
                throw new Error("compile failed\nERROR: 0:1: oops");
            });
            new Bad().render(ctx);
            new Bad().render(ctx);
            expect(ctx.draw).toHaveBeenCalledOnce();
            expect(ctx.blit).toHaveBeenCalledTimes(2);
            expect(ctx.cut).toHaveBeenCalledTimes(2);
            expect(error).toHaveBeenCalledOnce();
        } finally {
            error.mockRestore();
            debug.mockRestore();
        }
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
    opts: AddTransitionOpts & {
        snapshotStalls?: boolean;
        captureTimesOut?: boolean;
        element?: HTMLElement;
        history?: HistorySpecs;
        uaTransitions?: UATransitions;
        reducedMotion?: boolean;
    } = {},
) {
    const {
        snapshotStalls = false,
        captureTimesOut = false,
        element = {} as HTMLElement,
        history = createHistorySpecs(() => undefined),
        uaTransitions = { current: () => undefined },
        reducedMotion = false,
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
    let liveSource: (() => unknown) | null = null;
    const stage: TransitionStageLike = {
        frame: null,
        cut: () => {},
        render: () => {},
        setLiveSource: (source) => {
            liveSource = source;
        },
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
        reducedMotion,
        captureLive: () => ({ texture: null, dispose: () => {} }),
    };
    const onDestroy = vi.fn();
    const lives: FakeLive[] = [];
    const transition = new TransitionController(
        vfx,
        element,
        { waitFor: "none", ...transitionOpts },
        onDestroy,
        stage,
        history,
        uaTransitions,
        () => {
            const live = new FakeLive();
            lives.push(live);
            return live;
        },
    );
    return {
        transition,
        log,
        starts,
        onDestroy,
        disposed,
        chain: () => chain,
        lives,
        liveSource: () => liveSource,
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
    // A slow machine needs more than one settle() to reach the start.
    const started = async <T>(starts: T[], i: number): Promise<T> => {
        await vi.waitFor(() => {
            if (!starts[i]) {
                throw new Error(`run ${i} has not started`);
            }
        }, 5000);
        return starts[i];
    };

    const effectsOf = (chain: Effect[]) =>
        chain.slice(1).map((slot) => (slot as TransitionSlot).effect);

    const countedClass = (name: string) => {
        const created: Counted[] = [];
        class Counted implements Transition {
            readonly name = name;
            readonly params: unknown;
            constructor(params?: Record<string, unknown>) {
                this.params = params;
                created.push(this);
            }
            render() {}
        }
        return { Class: Counted, created };
    };

    const runOnce = async (
        transition: TransitionController,
        starts: unknown[],
        opts: Parameters<TransitionController["run"]>[1],
    ) => {
        const i = starts.length;
        const run = transition.run(() => {}, opts);
        await settle();
        ((await started(starts, i)) as { end: () => void }).end();
        await run;
    };

    test("runs the steps in order and unwraps at the end", async () => {
        const { transition, log, starts } = setup();
        const done = transition.run(() => {
            log.push("cb");
        });
        await settle();
        expect(transition.running).toBe(true);
        (await started(starts, 0)).end();
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
        await started(starts, 0);
        const runB = transition.run(cbB);
        await runA;
        expect(cbA).toHaveBeenCalledOnce();
        (await started(starts, 1)).end();
        expect(starts).toHaveLength(2);
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
        (await started(starts, 0)).end();
        await runB;
        expect(starts).toHaveLength(1);
    });

    test("cancel resolves the run and unwraps", async () => {
        const { transition, log, starts } = setup();
        const run = transition.run(() => {});
        await started(starts, 0);
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
            (await started(starts, i)).end();
            await run;
        }
        expect(log.filter((s) => s === "wrap")).toHaveLength(1);
        expect(log).not.toContain("unwrap");
        transition.destroy();
        expect(log[log.length - 1]).toBe("unwrap");
        expect(onDestroy).toHaveBeenCalledOnce();
    });

    test("an instance is used as is and hooked into the run", async () => {
        const start = vi.fn();
        const end = vi.fn();
        const instance: Transition = { render: () => {}, start, end };
        const { transition, starts, chain } = setup({ keepWrapped: true });
        for (let i = 0; i < 2; i++) {
            const run = transition.run(() => {}, { transition: instance });
            await settle();
            (await started(starts, i)).end();
            await run;
        }
        expect(effectsOf(chain())).toEqual([instance]);
        expect(start).toHaveBeenCalledTimes(2);
        expect(start.mock.calls[0][0]).toEqual({
            reverse: false,
            duration: 0.6,
        });
        expect(end).toHaveBeenCalledTimes(2);
    });

    test("a class whose constructor throws cuts", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            class Broken implements Transition {
                constructor() {
                    throw new Error("nope");
                }
            }
            const { transition, log, starts } = setup();
            const cb = vi.fn();
            await transition.run(cb, { transition: Broken });
            expect(cb).toHaveBeenCalledOnce();
            expect(starts).toHaveLength(0);
            expect(log).not.toContain("wrap");
            expect(error).toHaveBeenCalledOnce();
        } finally {
            error.mockRestore();
        }
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

    test("a new class swaps the transition in the chain", async () => {
        const { transition, starts, chain, disposed } = setup({
            keepWrapped: true,
        });
        const a = countedClass("a");
        const b = countedClass("b");
        for (const Class of [a.Class, b.Class, a.Class]) {
            await runOnce(transition, starts, { transition: Class });
        }
        expect(effectsOf(chain())).toEqual([a.created[1]]);
        expect(effectsOf([{}, ...disposed])).toEqual([
            a.created[0],
            b.created[0],
        ]);
    });

    test("a fresh class per run keeps the chain length", async () => {
        const { transition, starts, chain, disposed } = setup({
            keepWrapped: true,
        });
        for (let i = 0; i < 3; i++) {
            const run = transition.run(() => {}, {
                transition: countedClass(`fresh${i}`).Class,
            });
            await settle();
            (await started(starts, i)).end();
            await run;
            expect(chain()).toHaveLength(2);
        }
        expect(disposed).toHaveLength(2);
    });

    test("effects of a dropped run stay out of the chain", async () => {
        const { transition, starts, chain } = setup({ keepWrapped: true });
        const a = countedClass("a");
        const b = countedClass("b");
        const runA = transition.run(() => {}, { transition: a.Class });
        const runB = transition.run(() => {}, { transition: b.Class });
        await runA;
        await settle();
        (await started(starts, 0)).end();
        await runB;
        expect(effectsOf(chain())).toEqual([b.created[0]]);
    });

    test("a class makes a new transition per container", async () => {
        const { Class, created } = countedClass("each");
        const first = setup();
        const second = setup();
        const runs = [first, second].map(({ transition }) =>
            transition.run(() => {}, { transition: Class }),
        );
        await settle();
        (await started(first.starts, 0)).end();
        (await started(second.starts, 0)).end();
        await Promise.all(runs);
        expect(created).toHaveLength(2);
        expect(created[0]).not.toBe(created[1]);
    });

    test("the same class with equal params reuses the transition", async () => {
        const { Class, created } = countedClass("same");
        const { transition, starts } = setup({ keepWrapped: true });
        for (let i = 0; i < 2; i++) {
            await runOnce(transition, starts, {
                transition: Class,
                params: { amount: 1, dir: [1, 0] },
            });
        }
        expect(created).toHaveLength(1);
        expect(created[0].params).toEqual({ amount: 1, dir: [1, 0] });
    });

    test("changed params make a new transition and dispose the old", async () => {
        const { Class, created } = countedClass("changed");
        const { transition, starts, chain, disposed } = setup({
            keepWrapped: true,
        });
        await runOnce(transition, starts, {
            transition: Class,
            params: { amount: 1 },
        });
        await runOnce(transition, starts, {
            transition: Class,
            params: { amount: 2 },
        });
        expect(created).toHaveLength(2);
        expect(created[1].params).toEqual({ amount: 2 });
        expect(effectsOf(chain())).toEqual([created[1]]);
        expect(effectsOf([{}, ...disposed])).toEqual([created[0]]);
    });

    test("a run that sets transition drops the container's params", async () => {
        const { Class, created } = countedClass("drop");
        const { transition, starts } = setup({
            transition: Class,
            params: { amount: 1 },
        });
        await runOnce(transition, starts, { params: { speed: 2 } });
        await runOnce(transition, starts, { transition: Class });
        expect(created.map((c) => c.params)).toEqual([
            { amount: 1, speed: 2 },
            undefined,
        ]);
    });

    test("the spec's ease and overflow beat the transition's own", async () => {
        const start = vi.fn();
        const instance: Transition = {
            ease: "linear",
            overflow: 5,
            render: () => {},
            start,
        };
        const { transition, starts } = setup({ keepWrapped: true });
        await runOnce(transition, starts, { transition: instance });
        await runOnce(transition, starts, {
            transition: instance,
            ease: "smoothstep",
            overflow: true,
        });
        expect(starts.map((s) => s.opts.ease)).toEqual([
            "linear",
            "smoothstep",
        ]);
        expect(start.mock.calls.map(([run]) => run.overflow)).toEqual([
            5,
            true,
        ]);
    });

    test("an instance running in another container warns and cuts", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const instance: Transition = { name: "busy", render: () => {} };
            const first = setup();
            const second = setup();
            const running = first.transition.run(() => {}, {
                transition: instance,
            });
            const firstStart = await started(first.starts, 0);
            const cb = vi.fn();
            for (let i = 0; i < 2; i++) {
                await second.transition.run(cb, { transition: instance });
            }
            expect(cb).toHaveBeenCalledTimes(2);
            expect(second.starts).toHaveLength(0);
            expect(warn).toHaveBeenCalledOnce();
            firstStart.end();
            await running;
            await runOnce(second.transition, second.starts, {
                transition: instance,
            });
            expect(second.starts).toHaveLength(1);
        } finally {
            warn.mockRestore();
        }
    });

    test("destroy releases the instance", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const instance: Transition = { render: () => {} };
            const first = setup();
            const second = setup();
            const running = first.transition.run(() => {}, {
                transition: instance,
            });
            await started(first.starts, 0);
            first.transition.destroy();
            await running;
            await runOnce(second.transition, second.starts, {
                transition: instance,
            });
            expect(second.starts).toHaveLength(1);
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    test("warns once when the new content is not captured in time", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const { transition, starts } = setup({ captureTimesOut: true });
            for (let i = 0; i < 2; i++) {
                const run = transition.run(() => {});
                await settle();
                (await started(starts, i)).end();
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

    test("lazy opts resolve after cb and bind the transition then", async () => {
        const { Class, created } = countedClass("lazy");
        const { transition, log, starts, chain } = setup();
        const run = transition.run(
            () => {
                log.push("cb");
            },
            () => {
                log.push("resolveOpts");
                return { transition: Class };
            },
        );
        await settle();
        (await started(starts, 0)).end();
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
        expect(created).toHaveLength(1);
        expect(chain()).toEqual([]);
    });

    test("lazy opts reuse the transition of the same class", async () => {
        const { Class } = countedClass("same");
        const { transition, log, starts } = setup({ keepWrapped: true });
        for (let i = 0; i < 2; i++) {
            const run = transition.run(
                () => {},
                () => ({ transition: Class }),
            );
            await settle();
            (await started(starts, i)).end();
            await run;
        }
        expect(log.filter((s) => s === "updateEffects")).toHaveLength(1);
    });

    describe("autoReverse", () => {
        const recorder = (name: string) => {
            const runs: { name: string; reverse: boolean }[] = [];
            const make = (n: string) =>
                class implements Transition {
                    readonly name = n;
                    render() {}
                    start(run: TransitionRun) {
                        runs.push({ name: n, reverse: run.reverse });
                    }
                };
            return { A: make(`${name}-a`), B: make(`${name}-b`), runs };
        };
        const autoReverseSetup = (
            opts: AddTransitionOpts & { uaTransitions?: UATransitions } = {},
        ) => {
            let index = 0;
            const history = createHistorySpecs(() => ({
                index,
                key: `k${index}`,
            }));
            const { transition, starts } = setup({
                autoReverse: true,
                history,
                ...opts,
            });
            // Navigate to `next` in the run's callback.
            const step = async (
                next: number,
                opts: Parameters<TransitionController["run"]>[1],
            ) => {
                const i = starts.length;
                const done = transition.run(() => {
                    index = next;
                }, opts);
                await settle();
                (await started(starts, i)).end();
                await done;
            };
            // Navigate to `next` in a run that cuts.
            const cutTo = (
                next: number,
                opts: Parameters<TransitionController["run"]>[1],
            ) =>
                transition.run(() => {
                    index = next;
                }, opts);
            return { transition, starts, step, cutTo };
        };

        test("static opts: back plays the stored spec reversed", async () => {
            const { A, B, runs } = recorder("static");
            const { step } = autoReverseSetup();
            await step(1, { transition: A });
            await step(0, { transition: B });
            expect(runs).toEqual([
                { name: "static-a", reverse: false },
                { name: "static-a", reverse: true },
            ]);
        });

        test("lazy opts: forward plays the stored spec again", async () => {
            const { A, B, runs } = recorder("lazy");
            const { step } = autoReverseSetup();
            await step(1, () => ({ transition: A }));
            await step(0, () => ({ transition: B }));
            await step(1, () => ({ transition: B }));
            expect(runs).toEqual([
                { name: "lazy-a", reverse: false },
                { name: "lazy-a", reverse: true },
                { name: "lazy-a", reverse: false },
            ]);
        });

        test("a back the browser animated cuts and keeps history in step", async () => {
            const { A, B, runs } = recorder("ua");
            let animated: number | undefined;
            const { starts, step, cutTo } = autoReverseSetup({
                uaTransitions: { current: () => animated },
            });
            await step(1, { transition: A });
            animated = 1;
            await cutTo(0, { transition: B });
            animated = undefined;
            expect(starts).toHaveLength(1);
            // Forward again plays the spec that entered page 1.
            await step(1, { transition: B });
            expect(runs).toEqual([
                { name: "ua-a", reverse: false },
                { name: "ua-a", reverse: false },
            ]);
        });

        test("empty run opts on back use the container opts reversed", async () => {
            const { A, runs } = recorder("container");
            const { step } = autoReverseSetup({ transition: A });
            await step(1, {});
            await step(0, {});
            expect(runs).toEqual([
                { name: "container-a", reverse: false },
                { name: "container-a", reverse: true },
            ]);
        });
    });

    test("a navigation the browser animated cuts before the snapshot", async () => {
        const { transition, log, starts } = setup({
            uaTransitions: { current: () => 1 },
        });
        const cb = vi.fn();
        // Lazy opts still run, since they may take a pending link spec.
        const opts = vi.fn(() => ({ transition: Crossfade }));
        await transition.run(cb, opts);
        expect(cb).toHaveBeenCalledOnce();
        expect(opts).toHaveBeenCalledOnce();
        expect(log).not.toContain("snapshot");
        expect(log).not.toContain("wrap");
        expect(starts).toHaveLength(0);
    });

    test("a handle cuts once per browser-animated navigation", async () => {
        let animated = 1;
        const { transition, starts } = setup({
            uaTransitions: { current: () => animated },
        });
        await transition.run(vi.fn());
        expect(starts).toHaveLength(0);

        // Same navigation: the next run plays.
        const next = transition.run(vi.fn());
        await settle();
        (await started(starts, 0)).end();
        await next;

        // A new one cuts again, even back to the same entry.
        animated = 2;
        await transition.run(vi.fn());
        expect(starts).toHaveLength(1);
    });

    test("every handle cuts the same browser-animated navigation", async () => {
        const uaTransitions = { current: () => 1 };
        const a = setup({ uaTransitions });
        const b = setup({ uaTransitions });
        await a.transition.run(vi.fn());
        await b.transition.run(vi.fn());
        expect(a.starts).toHaveLength(0);
        expect(b.starts).toHaveLength(0);
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

// Moves fake nodes out, and back to the same index on dispose.
class FakeLive implements LiveFromLike {
    readonly texture = null;
    kept: unknown[] = [];
    disposed = false;
    #returning: {
        node: FakeElement;
        parent: FakeElement;
        index: number;
        onReturn: (node: Node) => void;
    }[] = [];

    keep(nodes: readonly Node[], onReturn?: (node: Node) => void): void {
        for (const node of nodes) {
            this.kept.push(node);
            const element = node as unknown as FakeElement;
            const parent = element.parentElement;
            if (onReturn && parent) {
                const index = parent.children.indexOf(element);
                this.#returning.push({
                    node: element,
                    parent,
                    index,
                    onReturn,
                });
            }
            element.remove?.();
        }
    }

    dispose(): void {
        this.disposed = true;
        for (const { node, parent, index, onReturn } of this.#returning
            .slice()
            .reverse()) {
            parent.insertAt(node, index);
            onReturn(node as unknown as Node);
        }
        this.#returning = [];
    }
}

// Just enough DOM for show(). Selectors match by id, like "#b".
class FakeElement {
    id: string;
    hidden = false;
    parentElement: FakeElement | null = null;
    children: FakeElement[] = [];
    connected = false;

    constructor(id: string) {
        this.id = id;
    }

    get isConnected(): boolean {
        return this.parentElement?.isConnected ?? this.connected;
    }

    append(child: FakeElement): void {
        child.remove();
        child.parentElement = this;
        this.children.push(child);
    }

    insertAt(child: FakeElement, index: number): void {
        child.remove();
        child.parentElement = this;
        this.children.splice(index, 0, child);
    }

    remove(): void {
        const parent = this.parentElement;
        if (parent) {
            parent.children = parent.children.filter((c) => c !== this);
            this.parentElement = null;
        }
    }

    contains(other: FakeElement): boolean {
        return (
            other === this ||
            this.children.some((child) => child.contains(other))
        );
    }

    querySelector(selector: string): FakeElement | null {
        for (const child of this.children) {
            if (`#${child.id}` === selector) {
                return child;
            }
            const found = child.querySelector(selector);
            if (found) {
                return found;
            }
        }
        return null;
    }
}

function slides(...ids: string[]) {
    const container = new FakeElement("container");
    container.connected = true;
    for (const id of ids) {
        const slide = new FakeElement(id);
        slide.hidden = id !== ids[0];
        container.append(slide);
    }
    const byId = (id: string) =>
        container.querySelector(`#${id}`) as FakeElement;
    const shown = () =>
        container.children.filter((c) => !c.hidden).map((c) => c.id);
    return {
        container,
        byId,
        shown,
        element: container as unknown as HTMLElement,
    };
}

describe("TransitionController.show", () => {
    beforeEach(() => {
        vi.stubGlobal("requestAnimationFrame", (fn: () => void) =>
            setTimeout(fn, 0),
        );
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const settle = () => new Promise((r) => setTimeout(r, 5));
    // A slow machine needs more than one settle() to reach the start.
    const started = async <T>(starts: T[], i: number): Promise<T> => {
        await vi.waitFor(() => {
            if (!starts[i]) {
                throw new Error(`run ${i} has not started`);
            }
        }, 5000);
        return starts[i];
    };
    const asElement = (el: FakeElement) => el as unknown as HTMLElement;

    test("hides the other children after the snapshot and shows the slide", async () => {
        const dom = slides("a", "b", "c");
        const { transition, log, starts } = setup({ element: dom.element });
        const done = transition.show(asElement(dom.byId("b")));
        expect(dom.shown()).toEqual(["a"]);
        const start = await started(starts, 0);
        expect(log.indexOf("snapshot")).toBeLessThan(log.indexOf("start"));
        expect(dom.shown()).toEqual(["b"]);
        start.end();
        await done;
        expect(dom.shown()).toEqual(["b"]);
        expect(dom.container.children).toHaveLength(3);
    });

    test("ignores autoReverse", async () => {
        const dom = slides("a", "b");
        const pick = vi.fn((spec) => spec);
        const { transition, starts } = setup({
            element: dom.element,
            autoReverse: true,
            history: { pick },
        });
        const done = transition.show(1);
        (await started(starts, 0)).end();
        await done;
        expect(dom.shown()).toEqual(["b"]);
        expect(pick).not.toHaveBeenCalled();
    });

    test("resolves an index or a selector", async () => {
        const dom = slides("a", "b", "c");
        const { transition, starts } = setup({ element: dom.element });
        const byIndex = transition.show(2);
        await settle();
        (await started(starts, 0)).end();
        await byIndex;
        expect(dom.shown()).toEqual(["c"]);
        const bySelector = transition.show("#b");
        await settle();
        (await started(starts, 1)).end();
        await bySelector;
        expect(dom.shown()).toEqual(["b"]);
    });

    test("throws before a run for a missing or non-child slide", () => {
        const dom = slides("a", "b");
        const nested = new FakeElement("nested");
        dom.byId("b").append(nested);
        const outside = new FakeElement("outside");
        outside.connected = true;
        const { transition, log } = setup({ element: dom.element });
        expect(() => transition.show(5)).toThrow(TypeError);
        expect(() => transition.show("#none")).toThrow(TypeError);
        expect(() => transition.show("#nested")).toThrow(TypeError);
        expect(() => transition.show(asElement(nested))).toThrow(TypeError);
        expect(() => transition.show(asElement(outside))).toThrow(TypeError);
        expect(log).toEqual([]);
        expect(transition.running).toBe(false);
    });

    test("appends a detached slide, then shows it", async () => {
        const dom = slides("a", "b");
        const fresh = new FakeElement("fresh");
        const { transition, starts } = setup({ element: dom.element });
        const done = transition.show(asElement(fresh));
        expect(fresh.parentElement).toBeNull();
        await settle();
        (await started(starts, 0)).end();
        await done;
        expect(fresh.parentElement).toBe(dom.container);
        expect(dom.shown()).toEqual(["fresh"]);
    });

    test("remove: true removes the other slides", async () => {
        const dom = slides("a", "b", "c");
        const { transition, starts } = setup({ element: dom.element });
        const done = transition.show(1, { remove: true });
        await settle();
        (await started(starts, 0)).end();
        await done;
        expect(dom.container.children.map((c) => c.id)).toEqual(["b"]);
        expect(dom.shown()).toEqual(["b"]);
    });

    test("the slide already shown resolves without a run", async () => {
        const dom = slides("a", "b");
        const { transition, log } = setup({ element: dom.element });
        await transition.show(0);
        expect(log).toEqual([]);
        expect(transition.running).toBe(false);
    });

    test("passes the options to the run but keeps remove out", async () => {
        const start = vi.fn();
        const instance: Transition = { render: () => {}, start };
        const dom = slides("a", "b");
        const { transition, starts } = setup({ element: dom.element });
        const done = transition.show(1, {
            transition: instance,
            reverse: true,
            remove: true,
        });
        await settle();
        (await started(starts, 0)).end();
        await done;
        expect(start).toHaveBeenCalledWith({
            reverse: true,
            duration: 0.6,
        });
    });

    test("slideSpec sets how each slide enters", async () => {
        const start = vi.fn();
        const instance: Transition = { render: () => {}, start };
        const dom = slides("a", "b", "c");
        const slideSpec = vi.fn((slide: HTMLElement) =>
            slide.id === "b"
                ? { transition: instance, duration: 2 }
                : undefined,
        );
        const { transition, starts } = setup({
            element: dom.element,
            duration: 1,
            reverse: true,
            slideSpec,
        });
        const toB = transition.show(1);
        await settle();
        (await started(starts, 0)).end();
        await toB;
        expect(slideSpec).toHaveBeenCalledWith(dom.byId("b"));
        expect(start).toHaveBeenCalledWith({ reverse: true, duration: 2 });
        expect(starts[0].opts.duration).toBe(2);

        const toC = transition.show(2);
        await settle();
        (await started(starts, 1)).end();
        await toC;
        expect(starts[1].opts.duration).toBe(1);
    });

    test("show() opts go over the slide spec", async () => {
        const start = vi.fn();
        const instance: Transition = { render: () => {}, start };
        const dom = slides("a", "b");
        const { transition, starts } = setup({
            element: dom.element,
            slideSpec: () => ({ transition: instance, duration: 2 }),
        });
        const done = transition.show(1, { duration: 3, reverse: true });
        await settle();
        (await started(starts, 0)).end();
        await done;
        expect(start).toHaveBeenCalledWith({ reverse: true, duration: 3 });
    });

    test("slideSpec is not called for the slide already shown", async () => {
        const slideSpec = vi.fn(() => undefined);
        const dom = slides("a", "b");
        const { transition } = setup({ element: dom.element, slideSpec });
        await transition.show(0);
        expect(slideSpec).not.toHaveBeenCalled();
    });
});

describe("reduced motion", () => {
    test("run cuts without touching VFX", async () => {
        const cb = vi.fn();
        const { transition, log, starts } = setup({
            transition: Crossfade,
            duration: 1,
            reducedMotion: true,
        });
        await transition.run(cb);
        expect(cb).toHaveBeenCalledOnce();
        expect(log).toEqual([]);
        expect(starts).toEqual([]);
        expect(transition.running).toBe(false);
    });

    test("run picks the history spec after cb", async () => {
        const order: string[] = [];
        const pick = vi.fn((spec) => {
            order.push("pick");
            return spec;
        });
        const { transition } = setup({
            autoReverse: true,
            history: { pick },
            reducedMotion: true,
        });
        await transition.run(() => {
            order.push("cb");
        });
        expect(order).toEqual(["cb", "pick"]);
    });

    test("show cuts", async () => {
        const dom = slides("a", "b");
        const { transition, starts } = setup({
            element: dom.element,
            transition: Crossfade,
            duration: 1,
            reducedMotion: true,
        });
        await transition.show(1);
        expect(dom.shown()).toEqual(["b"]);
        expect(starts).toEqual([]);
    });
});

describe("liveFrom", () => {
    beforeEach(() => {
        vi.stubGlobal("requestAnimationFrame", (fn: () => void) =>
            setTimeout(fn, 0),
        );
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const started = async <T>(starts: T[], i: number): Promise<T> => {
        await vi.waitFor(() => {
            if (!starts[i]) {
                throw new Error(`run ${i} has not started`);
            }
        }, 5000);
        return starts[i];
    };
    const node = (id: string) => new FakeElement(id) as unknown as Node;

    test("keeps the handed-over nodes until the run ends", async () => {
        const { transition, starts, lives, liveSource } = setup();
        const old = [node("a"), node("b")];
        const run = transition.run(
            (ctx) => {
                ctx.keepPrev(old);
            },
            { liveFrom: true },
        );
        const start = await started(starts, 0);
        expect(lives).toHaveLength(1);
        expect(lives[0].kept).toEqual(old);
        expect(liveSource()).not.toBeNull();
        start.end();
        await run;
        expect(lives[0].disposed).toBe(true);
        expect(liveSource()).toBeNull();
    });

    test("takes a single node and the container's liveFrom", async () => {
        const { transition, starts, lives } = setup({ liveFrom: true });
        const old = node("a");
        const run = transition.run((ctx) => ctx.keepPrev(old));
        (await started(starts, 0)).end();
        await run;
        expect(lives[0].kept).toEqual([old]);
    });

    test("keepPrev does nothing without liveFrom", async () => {
        const { transition, starts, lives } = setup();
        const run = transition.run((ctx) => ctx.keepPrev(node("a")));
        (await started(starts, 0)).end();
        await run;
        expect(lives).toHaveLength(0);
    });

    test("keepPrev does nothing when the run cuts", async () => {
        const { transition, lives } = setup({ liveFrom: true });
        await transition.run((ctx) => ctx.keepPrev(node("a")), {
            duration: 0,
        });
        expect(lives).toHaveLength(0);
    });

    test("a lazy spec without liveFrom drops the nodes after cb", async () => {
        const { transition, starts, lives, liveSource } = setup();
        const run = transition.run(
            (ctx) => ctx.keepPrev(node("a")),
            () => ({}),
        );
        const start = await started(starts, 0);
        expect(lives[0].disposed).toBe(true);
        expect(liveSource()).toBeNull();
        start.end();
        await run;
    });

    test("a lazy spec with liveFrom keeps the nodes", async () => {
        const { transition, starts, lives } = setup();
        const run = transition.run(
            (ctx) => ctx.keepPrev(node("a")),
            () => ({ liveFrom: true }),
        );
        const start = await started(starts, 0);
        expect(lives[0].disposed).toBe(false);
        start.end();
        await run;
        expect(lives[0].disposed).toBe(true);
    });

    test("a lazy duration 0 drops the nodes", async () => {
        const { transition, lives, liveSource } = setup();
        await transition.run(
            (ctx) => ctx.keepPrev(node("a")),
            () => ({ duration: 0, liveFrom: true }),
        );
        expect(lives[0].disposed).toBe(true);
        expect(liveSource()).toBeNull();
    });

    test("cancel drops the nodes", async () => {
        const { transition, starts, lives, liveSource } = setup();
        const run = transition.run((ctx) => ctx.keepPrev(node("a")), {
            liveFrom: true,
        });
        await started(starts, 0);
        transition.cancel();
        expect(lives[0].disposed).toBe(true);
        expect(liveSource()).toBeNull();
        await run;
    });

    test("destroy drops the nodes", async () => {
        const { transition, starts, lives } = setup();
        const run = transition.run((ctx) => ctx.keepPrev(node("a")), {
            liveFrom: true,
        });
        await started(starts, 0);
        transition.destroy();
        expect(lives[0].disposed).toBe(true);
        await run;
    });

    test("a cb that throws drops the nodes", async () => {
        const { transition, lives } = setup();
        const run = transition.run(
            (ctx) => {
                ctx.keepPrev(node("a"));
                throw new Error("nope");
            },
            { liveFrom: true },
        );
        await expect(run).rejects.toThrow("nope");
        expect(lives[0].disposed).toBe(true);
    });

    test("a run that never ends drops the nodes", async () => {
        vi.useFakeTimers();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const { transition, lives, liveSource } = setup();
            const run = transition.run((ctx) => ctx.keepPrev(node("a")), {
                liveFrom: true,
                duration: 0.5,
            });
            await vi.advanceTimersByTimeAsync(1600);
            await run;
            expect(lives[0].disposed).toBe(true);
            expect(liveSource()).toBeNull();
        } finally {
            warn.mockRestore();
            vi.useRealTimers();
        }
    });

    test("a newer run drops the old nodes at once", async () => {
        const { transition, starts, lives } = setup({ liveFrom: true });
        const runA = transition.run((ctx) => ctx.keepPrev(node("a")));
        await started(starts, 0);
        const runB = transition.run((ctx) => ctx.keepPrev(node("b")));
        expect(lives[0].disposed).toBe(true);
        await runA;
        (await started(starts, 1)).end();
        await runB;
        expect(lives).toHaveLength(2);
        expect(lives.every((live) => live.disposed)).toBe(true);
    });

    test("a stale run keeps nothing", async () => {
        const { transition, starts, lives } = setup({ liveFrom: true });
        let releaseA = () => {};
        const gate = new Promise<void>((resolve) => {
            releaseA = resolve;
        });
        const enteredA = vi.fn();
        const runA = transition.run(async (ctx) => {
            enteredA();
            await gate;
            ctx.keepPrev(node("a"));
        });
        await vi.waitFor(() => expect(enteredA).toHaveBeenCalled());
        const runB = transition.run(() => {});
        releaseA();
        await runA;
        (await started(starts, 0)).end();
        await runB;
        expect(lives).toHaveLength(0);
    });

    describe("show", () => {
        test("puts the old slide back in place, hidden", async () => {
            const dom = slides("a", "b", "c");
            const { transition, starts, lives } = setup({
                element: dom.element,
            });
            const first = transition.show(1);
            (await started(starts, 0)).end();
            await first;
            const b = dom.byId("b");
            const done = transition.show(2, { liveFrom: true });
            const start = await started(starts, 1);
            expect(lives[0].kept).toEqual([b]);
            expect(dom.container.children.map((c) => c.id)).toEqual(["a", "c"]);
            start.end();
            await done;
            expect(dom.container.children.map((c) => c.id)).toEqual([
                "a",
                "b",
                "c",
            ]);
            expect(dom.shown()).toEqual(["c"]);
        });

        test("remove: true removes the old slide after putting it back", async () => {
            const dom = slides("a", "b", "c");
            const { transition, starts } = setup({ element: dom.element });
            const done = transition.show(1, { remove: true, liveFrom: true });
            (await started(starts, 0)).end();
            await done;
            expect(dom.container.children.map((c) => c.id)).toEqual(["b"]);
        });

        test("a newer show can pick the slide a run holds", async () => {
            const dom = slides("a", "b", "c");
            const { transition, starts, lives } = setup({
                element: dom.element,
                liveFrom: true,
            });
            const a = dom.byId("a");
            const first = transition.show(1);
            await started(starts, 0);
            expect(a.parentElement).toBeNull();
            const second = transition.show(0);
            expect(lives[0].disposed).toBe(true);
            await first;
            (await started(starts, 1)).end();
            await second;
            expect(dom.container.children.map((c) => c.id)).toEqual([
                "a",
                "b",
                "c",
            ]);
            expect(dom.shown()).toEqual(["a"]);
        });

        test("cancel puts the old slide back", async () => {
            const dom = slides("a", "b");
            const { transition, starts } = setup({
                element: dom.element,
                liveFrom: true,
            });
            const done = transition.show(1);
            await started(starts, 0);
            transition.cancel();
            await done;
            expect(dom.container.children.map((c) => c.id)).toEqual(["a", "b"]);
            expect(dom.shown()).toEqual(["b"]);
        });
    });
});
