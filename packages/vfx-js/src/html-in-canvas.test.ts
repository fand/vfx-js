import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { moveNode, waitForFlush } from "./html-in-canvas";

describe("waitForFlush", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test("resolves when the waiter is called", async () => {
        const waiters = new Set<() => void>();
        let resolved = false;
        waitForFlush(waiters, 300).then(() => {
            resolved = true;
        });
        expect(waiters.size).toBe(1);
        for (const done of [...waiters]) {
            done();
        }
        await Promise.resolve();
        expect(resolved).toBe(true);
        expect(waiters.size).toBe(0);
    });

    test("resolves on timeout and removes itself", async () => {
        const waiters = new Set<() => void>();
        let resolved = false;
        waitForFlush(waiters, 300).then(() => {
            resolved = true;
        });
        await vi.advanceTimersByTimeAsync(299);
        expect(resolved).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(resolved).toBe(true);
        expect(waiters.size).toBe(0);
    });
});

function fakeParent(moveBefore?: () => void) {
    const calls: string[] = [];
    const parent = {
        insertBefore: () => {
            calls.push("insertBefore");
        },
        moveBefore: moveBefore
            ? () => {
                  calls.push("moveBefore");
                  moveBefore();
              }
            : undefined,
    } as unknown as ParentNode & Node;
    return { parent, calls };
}

describe("moveNode", () => {
    const node = {} as Node;

    test("uses moveBefore when present", () => {
        const { parent, calls } = fakeParent(() => {});
        moveNode(parent, node, null);
        expect(calls).toEqual(["moveBefore"]);
    });

    test("falls back to insertBefore without moveBefore", () => {
        const { parent, calls } = fakeParent();
        moveNode(parent, node, null);
        expect(calls).toEqual(["insertBefore"]);
    });

    test("falls back to insertBefore when moveBefore throws", () => {
        const { parent, calls } = fakeParent(() => {
            throw new Error("HierarchyRequestError");
        });
        moveNode(parent, node, null);
        expect(calls).toEqual(["moveBefore", "insertBefore"]);
    });
});
