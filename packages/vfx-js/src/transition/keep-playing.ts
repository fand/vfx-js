import { moveNode } from "../html-in-canvas.js";
import type { EffectTexture } from "../types.js";
import type { VFX } from "../vfx.js";

export type KeepPlayingHost = Pick<VFX, "captureLive" | "freezeInside">;

/** Holds the old content of a run and captures it every frame. */
export type KeepPlayingLike = {
    /** The latest capture, or null before the first one. */
    readonly texture: EffectTexture | null;
    /**
     * Move the nodes in.
     * With `onReturn`, `dispose()` moves each node back to its old place, then calls it.
     */
    keep(nodes: readonly Node[], onReturn?: (node: Node) => void): void;
    /** Stop capturing, put back the nodes that asked for it and remove the rest. */
    dispose(): void;
};

type Returning = {
    node: Node;
    marker: Comment;
    onReturn: (node: Node) => void;
};

/**
 * A hidden html-in-canvas canvas next to the element's wrapper.
 * It holds a shallow copy of the element, so selectors for its children still match.
 */
export class KeepPlaying implements KeepPlayingLike {
    #host: KeepPlayingHost;
    #canvas: HTMLCanvasElement;
    #box: HTMLElement;
    #capture: {
        readonly texture: EffectTexture | null;
        dispose(): void;
    } | null = null;
    #unfreeze: () => void;
    #returning: Returning[] = [];

    constructor(host: KeepPlayingHost, element: HTMLElement) {
        this.#host = host;
        // While a run is in flight, the parent is the wrapper canvas.
        const anchor = element.parentElement ?? element;
        const rect = anchor.getBoundingClientRect();

        const canvas = document.createElement("canvas");
        canvas.inert = true;
        canvas.setAttribute("aria-hidden", "true");
        // Routers that swap the body look for it to carry it over.
        canvas.setAttribute("data-vfx-keep-playing", "");
        const style = canvas.style;
        style.setProperty("position", "absolute");
        style.setProperty("left", "0px");
        style.setProperty("top", "0px");
        style.setProperty("margin", "0");
        style.setProperty("padding", "0");
        style.setProperty("border", "none");
        style.setProperty("pointer-events", "none");
        style.setProperty("width", `${rect.width}px`);
        style.setProperty("height", `${rect.height}px`);

        const box = element.cloneNode(false) as HTMLElement;
        box.removeAttribute("id");
        box.style.setProperty("margin", "0");
        box.style.setProperty("box-sizing", "border-box");
        box.style.setProperty("width", `${rect.width}px`);
        box.style.setProperty("height", `${rect.height}px`);
        canvas.append(box);

        if (anchor.parentNode && anchor !== element) {
            anchor.after(canvas);
        } else {
            document.body.append(canvas);
        }
        // Line it up with the wrapper, whatever the containing block is.
        const placed = canvas.getBoundingClientRect();
        style.setProperty("left", `${rect.left - placed.left}px`);
        style.setProperty("top", `${rect.top - placed.top}px`);
        // Style the box before moving nodes in, or their CSS animations restart.
        getComputedStyle(box).display;

        this.#canvas = canvas;
        this.#box = box;
        this.#unfreeze = host.freezeInside(canvas);
    }

    get texture(): EffectTexture | null {
        return this.#capture?.texture ?? null;
    }

    keep(nodes: readonly Node[], onReturn?: (node: Node) => void): void {
        for (const node of nodes) {
            const parent = node.parentNode;
            if (onReturn && parent) {
                const marker = document.createComment("");
                parent.insertBefore(marker, node);
                this.#returning.push({ node, marker, onReturn });
            }
            moveNode(this.#box, node, null);
        }
        this.#capture ??= this.#host.captureLive(this.#canvas);
    }

    dispose(): void {
        this.#capture?.dispose();
        this.#capture = null;
        for (const { node, marker, onReturn } of this.#returning) {
            const parent = marker.parentNode;
            if (parent) {
                moveNode(parent, node, marker);
                marker.remove();
            }
            onReturn(node);
        }
        this.#returning = [];
        this.#canvas.remove();
        this.#unfreeze();
    }
}
