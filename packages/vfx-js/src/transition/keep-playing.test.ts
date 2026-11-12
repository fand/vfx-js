// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { KeepPlaying, type KeepPlayingHost } from "./keep-playing";

function setup() {
    const capture = { texture: null, dispose: vi.fn() };
    const unfreeze = vi.fn();
    const host: KeepPlayingHost = {
        captureLive: vi.fn(() => capture),
        freezeInside: vi.fn(() => unfreeze),
    };
    const wrapper = document.createElement("canvas");
    const element = document.createElement("div");
    wrapper.append(element);
    document.body.append(wrapper);
    const keep = new KeepPlaying(host, element);
    const ghost = () => document.querySelector("[data-vfx-keep-playing]");
    return { keep, element, capture, unfreeze, ghost };
}

const child = (parent: HTMLElement, text: string) => {
    const node = document.createElement("p");
    node.textContent = text;
    parent.append(node);
    return node;
};

describe("KeepPlaying", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("puts the nodes back in place and calls onReturn", () => {
        const { keep, element, ghost } = setup();
        const a = child(element, "a");
        const b = child(element, "b");
        const onReturn = vi.fn();
        keep.keep([a], onReturn);
        expect(element.textContent).toBe("b");
        keep.dispose();
        expect(element.textContent).toBe("ab");
        expect(onReturn).toHaveBeenCalledWith(a);
        expect(b.parentNode).toBe(element);
        expect(ghost()).toBeNull();
    });

    test("a throwing onReturn does not stop the rest", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const { keep, element, capture, unfreeze, ghost } = setup();
        const a = child(element, "a");
        const b = child(element, "b");
        const second = vi.fn();
        keep.keep([a], () => {
            throw new Error("nope");
        });
        keep.keep([b], second);
        keep.dispose();
        expect(element.textContent).toBe("ab");
        expect(second).toHaveBeenCalledWith(b);
        expect(error).toHaveBeenCalledOnce();
        expect(capture.dispose).toHaveBeenCalledOnce();
        expect(unfreeze).toHaveBeenCalledOnce();
        expect(ghost()).toBeNull();
    });

    test("calls onReturn for a node that had no parent", () => {
        const { keep } = setup();
        const loose = document.createElement("p");
        const onReturn = vi.fn();
        keep.keep([loose], onReturn);
        keep.dispose();
        expect(onReturn).toHaveBeenCalledWith(loose);
        expect(loose.isConnected).toBe(false);
    });

    test("scrolls the box like the element was", () => {
        const { element, ghost } = setup();
        element.scrollTop = 120;
        element.scrollLeft = 30;
        const keep = new KeepPlaying(
            {
                captureLive: () => ({ texture: null, dispose: () => {} }),
                freezeInside: () => () => {},
            },
            element,
        );
        keep.keep([child(element, "a")]);
        const box = ghost()?.firstElementChild as HTMLElement;
        expect(box.style.overflow).toBe("hidden");
        expect([box.scrollLeft, box.scrollTop]).toEqual([30, 120]);
    });

    test("follows the wrapper's size during the run", () => {
        const observers: { fire(): void; disconnect: () => void }[] = [];
        vi.stubGlobal(
            "ResizeObserver",
            class {
                #callback: () => void;
                disconnect = vi.fn();
                constructor(callback: () => void) {
                    this.#callback = callback;
                    observers.push(this);
                }
                observe() {}
                fire() {
                    this.#callback();
                }
            },
        );
        try {
            const wrapper = document.createElement("canvas");
            const element = document.createElement("div");
            wrapper.append(element);
            document.body.append(wrapper);
            let size = { width: 100, height: 50 };
            wrapper.getBoundingClientRect = () =>
                ({ left: 0, top: 0, ...size }) as DOMRect;
            const keep = new KeepPlaying(
                {
                    captureLive: () => ({ texture: null, dispose: () => {} }),
                    freezeInside: () => () => {},
                },
                element,
            );
            const canvas = document.querySelector(
                "[data-vfx-keep-playing]",
            ) as HTMLElement;
            const box = canvas.firstElementChild as HTMLElement;
            expect([canvas.style.width, box.style.height]).toEqual([
                "100px",
                "50px",
            ]);
            size = { width: 300, height: 120 };
            observers[0].fire();
            expect([canvas.style.width, canvas.style.height]).toEqual([
                "300px",
                "120px",
            ]);
            expect([box.style.width, box.style.height]).toEqual([
                "300px",
                "120px",
            ]);
            keep.dispose();
            expect(observers[0].disconnect).toHaveBeenCalledOnce();
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
