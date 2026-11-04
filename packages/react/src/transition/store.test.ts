import type { TransitionDef } from "@vfx-js/core";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    hasPending,
    markBackNavigation,
    setNextTransition,
    takePending,
    transition,
} from "./store.js";

const swipe: TransitionDef = { name: "swipe", frag: "" };
const zoom: TransitionDef = { name: "zoom", frag: "" };

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
        transition({ transition: swipe })(click());
        expect(takePending()).toEqual({ transition: swipe });
    });

    it.each([
        ["defaultPrevented", { defaultPrevented: true }],
        ["middle button", { button: 1 }],
        ["meta", { metaKey: true }],
        ["ctrl", { ctrlKey: true }],
        ["shift", { shiftKey: true }],
        ["alt", { altKey: true }],
    ])("ignores %s", (_name, init) => {
        transition({ transition: swipe })(click(init));
        expect(takePending()).toBeNull();
    });

    it("ignores target=_blank", () => {
        transition({ transition: swipe })(click({}, "_blank"));
        expect(takePending()).toBeNull();
    });

    it("accepts target=_self", () => {
        transition({ type: "forward" })(click({}, "_self"));
        expect(takePending()).toEqual({ type: "forward" });
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
        setNextTransition({ transition: zoom });
        expect(takePending()).toEqual({ transition: zoom });
        expect(takePending()).toBeNull();
    });

    it("expires after 10 s", () => {
        setNextTransition({ transition: zoom });
        vi.advanceTimersByTime(9999);
        expect(hasPending()).toBe(true);
        vi.advanceTimersByTime(2);
        expect(takePending()).toBeNull();
    });

    it("back only fills an empty store", () => {
        setNextTransition({ transition: zoom });
        markBackNavigation();
        expect(takePending()).toEqual({ transition: zoom });
        markBackNavigation();
        expect(takePending()).toEqual({ type: "back" });
    });
});
