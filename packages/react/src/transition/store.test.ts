import type { Transition } from "@vfx-js/core";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    hasPending,
    setNextTransition,
    takePending,
    transition,
} from "./store.js";

class Swipe implements Transition {
    readonly name = "swipe";
}
class Zoom implements Transition {
    readonly name = "zoom";
}

function click(
    init: Partial<React.MouseEvent> = {},
    target?: string,
): React.MouseEvent {
    return {
        defaultPrevented: false,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        currentTarget: {
            getAttribute: (name: string) =>
                name === "target" ? (target ?? null) : null,
        },
        ...init,
    } as unknown as React.MouseEvent;
}

describe("transition()", () => {
    beforeEach(() => {
        takePending();
    });

    it("sets the spec on a plain left click", () => {
        transition({ transition: Swipe })(click());
        expect(takePending()).toEqual({ transition: Swipe });
    });

    it.each([
        ["defaultPrevented", { defaultPrevented: true }],
        ["middle button", { button: 1 }],
        ["meta", { metaKey: true }],
        ["ctrl", { ctrlKey: true }],
        ["shift", { shiftKey: true }],
        ["alt", { altKey: true }],
    ])("ignores %s", (_name, init) => {
        transition({ transition: Swipe })(click(init));
        expect(takePending()).toBeNull();
    });

    it("ignores target=_blank", () => {
        transition({ transition: Swipe })(click({}, "_blank"));
        expect(takePending()).toBeNull();
    });

    it("accepts target=_self", () => {
        transition({ duration: 2 })(click({}, "_self"));
        expect(takePending()).toEqual({ duration: 2 });
    });
});

describe("pending spec", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        takePending();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("is taken once", () => {
        setNextTransition({ transition: Zoom });
        expect(takePending()).toEqual({ transition: Zoom });
        expect(takePending()).toBeNull();
    });

    it("expires after 10 s", () => {
        setNextTransition({ transition: Zoom });
        vi.advanceTimersByTime(9999);
        expect(hasPending()).toBe(true);
        vi.advanceTimersByTime(2);
        expect(takePending()).toBeNull();
    });
});
