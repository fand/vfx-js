// @vitest-environment happy-dom
import type { RunOpts, Transition } from "@vfx-js/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTransitionInstance } from "./useTransitionInstance.js";

type WaveParams = { amount?: number; dir?: [number, number] };

class Wave implements Transition {
    readonly name = "wave";
    params: WaveParams;
    constructor(params: WaveParams = {}) {
        this.params = params;
    }
}

class Other implements Transition {
    readonly name = "other";
}

(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("useTransitionInstance", () => {
    let container: HTMLElement;
    let root: Root;
    const seen: Transition[] = [];

    function Probe(props: {
        Class?: new (params?: WaveParams) => Transition;
        params?: WaveParams;
    }) {
        seen.push(
            useTransitionInstance<WaveParams, Transition>(
                props.Class ?? Wave,
                props.params,
            ),
        );
        return null;
    }

    const render = (props: Parameters<typeof Probe>[0]) =>
        act(() => {
            root.render(<Probe {...props} />);
        });

    beforeEach(() => {
        seen.length = 0;
        container = document.createElement("div");
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
    });

    it("keeps the instance for equal params", () => {
        render({ params: { amount: 1, dir: [1, 0] } });
        render({ params: { amount: 1, dir: [1, 0] } });
        expect(seen).toHaveLength(2);
        expect(seen[1]).toBe(seen[0]);
        expect(seen[0]).toBeInstanceOf(Wave);
        expect((seen[0] as Wave).params).toEqual({ amount: 1, dir: [1, 0] });
    });

    it("treats missing params as empty", () => {
        render({});
        render({ params: {} });
        expect(seen[1]).toBe(seen[0]);
    });

    it("makes a new instance when params change", () => {
        render({ params: { amount: 1 } });
        render({ params: { amount: 2 } });
        render({ params: { amount: 2, dir: [0, 1] } });
        expect(new Set(seen).size).toBe(3);
        expect((seen[2] as Wave).params).toEqual({ amount: 2, dir: [0, 1] });
    });

    it("makes a new instance when the class changes", () => {
        render({});
        render({ Class: Other });
        expect(seen[1]).not.toBe(seen[0]);
        expect(seen[1]).toBeInstanceOf(Other);
    });

    it("infers params from the class", () => {
        function Typed() {
            const wave: Wave = useTransitionInstance(Wave, { amount: 1 });
            // @ts-expect-error wrong param type
            useTransitionInstance(Wave, { amount: "x" });
            const spec: RunOpts<typeof Wave> = {
                transition: Wave,
                params: { dir: [1, 0] },
            };
            // @ts-expect-error params do not go with an instance
            const bad: RunOpts<Wave> = { transition: wave, params: {} };
            void spec;
            void bad;
            return null;
        }
        expect(Typed).toBeTypeOf("function");
    });
});
