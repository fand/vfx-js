import { afterEach, describe, expect, test, vi } from "vitest";
import { createHistorySpecs, type HistoryEntry } from "./history";
import type { RunOpts } from "./types";

class Swipe {
    render() {}
}
class Zoom {
    render() {}
}

const a: RunOpts = { transition: Swipe, duration: 1 };
const b: RunOpts = { transition: Zoom };
const link: RunOpts = { duration: 2 };

// A fake history stack. Push drops the forward entries and adds a new key.
function setup() {
    let keys = ["k0"];
    let index = 0;
    let seq = 1;
    let off = false;
    const history = createHistorySpecs((): HistoryEntry | undefined =>
        off ? undefined : { index, key: keys[index] },
    );
    return {
        history,
        push: () => {
            keys = [...keys.slice(0, index + 1), `k${seq++}`];
            index++;
        },
        go: (delta: number) => {
            index += delta;
        },
        off: () => {
            off = true;
        },
    };
}

describe("createHistorySpecs", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("push stores and returns the spec", () => {
        const { history, push } = setup();
        push();
        expect(history.pick(a)).toBe(a);
        push();
        expect(history.pick(b)).toBe(b);
    });

    test("back plays the spec of the entry left, reversed", () => {
        const { history, push, go } = setup();
        push();
        history.pick(a);
        push();
        history.pick(b);
        go(-1);
        expect(history.pick(link)).toEqual({ ...b, reverse: true });
        go(-1);
        expect(history.pick(link)).toEqual({ ...a, reverse: true });
    });

    test("forward button plays the spec of the entry entered", () => {
        const { history, push, go } = setup();
        push();
        history.pick(a);
        go(-1);
        history.pick(link);
        go(1);
        expect(history.pick(link)).toBe(a);
    });

    test("push after back uses the new spec", () => {
        const { history, push, go } = setup();
        push();
        history.pick(a);
        go(-1);
        history.pick(link);
        push();
        expect(history.pick(b)).toBe(b);
        go(-1);
        expect(history.pick(link)).toEqual({ ...b, reverse: true });
    });

    test("replace stores the new spec for the same entry", () => {
        const { history, push, go } = setup();
        push();
        history.pick(a);
        // Replace keeps the entry and its key.
        expect(history.pick(b)).toBe(b);
        go(-1);
        expect(history.pick(link)).toEqual({ ...b, reverse: true });
    });

    test("a jump back plays the top entry's spec reversed", () => {
        const { history, push, go } = setup();
        push();
        history.pick(a);
        push();
        history.pick(b);
        go(-2);
        expect(history.pick(link)).toEqual({ ...b, reverse: true });
    });

    test("falls back to the spec when nothing is stored", () => {
        const { history, push, go } = setup();
        push();
        push();
        expect(history.pick(a)).toBe(a);
        go(-1);
        expect(history.pick(b)).toEqual({ ...a, reverse: true });
        go(-1);
        expect(history.pick(b)).toBe(b);
    });

    test("no entry returns the spec as is", () => {
        const { history, off } = setup();
        off();
        expect(history.pick(a)).toBe(a);
    });

    test("default source: no Navigation API, index -1 or no key", () => {
        const history = createHistorySpecs();
        vi.stubGlobal("navigation", undefined);
        expect(history.pick(a)).toBe(a);
        vi.stubGlobal("navigation", {
            currentEntry: { index: -1, key: "x" },
        });
        expect(history.pick(a)).toBe(a);
        vi.stubGlobal("navigation", { currentEntry: { index: 0, key: "" } });
        expect(history.pick(a)).toBe(a);
    });

    test("default source reads the Navigation API", () => {
        const navigation = { currentEntry: { index: 1, key: "one" } };
        vi.stubGlobal("navigation", navigation);
        const history = createHistorySpecs();
        history.pick(a);
        navigation.currentEntry = { index: 2, key: "two" };
        history.pick(b);
        navigation.currentEntry = { index: 1, key: "one" };
        expect(history.pick(link)).toEqual({ ...b, reverse: true });
    });
});
