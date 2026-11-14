import { isHicCanvas } from "./hic-canvas.js";
import {
    lockCanvasSize,
    releaseFirstCapture,
    requestCapture,
    unwrapElement,
    wrapElement,
} from "./html-in-canvas.js";
import { supportsHtmlInCanvas } from "./html-in-canvas-support.js";
import { captureLive, type LiveCapture } from "./live-capture.js";
import { prefersReducedMotion } from "./reduced-motion.js";
import { TransitionController } from "./transition/transition.js";
import type {
    AddTransitionOpts,
    Transition,
    TransitionClass,
    TransitionHandle,
} from "./transition/types.js";
import {
    type Effect,
    getVFXOpts,
    type VFXCapture,
    type VFXCaptureOpts,
    type VFXOpts,
    type VFXProps,
} from "./types.js";
import { VFXPlayer } from "./vfx-player.js";
import { isWebGLAvailable } from "./webgl-support.js";

function checkEnvironment() {
    if (typeof window === "undefined") {
        throw "Cannot find 'window'. VFX-JS only runs on the browser.";
    }
    if (typeof document === "undefined") {
        throw "Cannot find 'document'. VFX-JS only runs on the browser.";
    }
}

function getCanvasStyle(fixed: boolean) {
    return {
        position: fixed ? "fixed" : "absolute",
        top: 0,
        left: 0,
        // Sized by VFXPlayer#updateCanvasSize; avoid 100vw/100vh which
        // can cause overflow on iOS Safari.
        width: "0px",
        height: "0px",
        "z-index": 9999,
        "pointer-events": "none",
    };
}

/**
 * The main interface of VFX-JS.
 */
export class VFX {
    #player: VFXPlayer;
    #canvas: HTMLCanvasElement;
    #wrapperCanvases = new Map<HTMLElement, HTMLCanvasElement>();
    // Elements that addHTML is still wrapping.
    #wrapping = new Set<HTMLElement>();
    #transitions = new Set<TransitionHandle>();
    // Null while the first capture is pending.
    #captures = new Map<HTMLElement, VFXCapture | null>();
    #reducedMotion: boolean;
    #destroyed = false;

    /**
     * Create a VFX instance if WebGL is available, or return `null`.
     */
    static init(options?: VFXOpts): VFX | null {
        try {
            return new VFX(options);
        } catch {
            return null;
        }
    }

    /**
     * Creates VFX instance and start playing immediately.
     * When the user prefers reduced motion, it renders nothing:
     * elements stay plain HTML and transitions cut to the new content.
     * @throws When WebGL is not available in the current environment.
     */
    constructor(options: VFXOpts = {}) {
        checkEnvironment();

        if (!isWebGLAvailable()) {
            throw new Error(
                "[VFX-JS] WebGL is not available in this environment.",
            );
        }

        const opts = getVFXOpts(options);
        this.#reducedMotion = prefersReducedMotion();

        // Setup canvas
        const canvas = document.createElement("canvas");
        const canvasStyle = getCanvasStyle(opts.fixedCanvas);
        for (const [k, v] of Object.entries(canvasStyle)) {
            canvas.style.setProperty(k, v.toString());
        }
        if (opts.zIndex !== undefined) {
            canvas.style.setProperty("z-index", opts.zIndex.toString());
        }
        (opts.wrapper ?? document.body).appendChild(canvas);
        this.#canvas = canvas;

        this.#player = new VFXPlayer(opts, canvas);

        if (opts.autoplay) {
            this.play();
        }
    }

    /**
     * Register an element to track the position and render visual effects in the area.
     */
    add(element: HTMLElement, opts: VFXProps): Promise<void>;
    /**
     * @internal Used by VFXCanvas (@vfx-js/react) to pass the first html-in-canvas capture.
     */
    add(
        element: HTMLElement,
        opts: VFXProps,
        initialCapture?: OffscreenCanvas,
    ): Promise<void>;
    async add(
        element: HTMLElement,
        opts: VFXProps,
        initialCapture?: OffscreenCanvas,
    ): Promise<void> {
        if (this.#reducedMotion) {
            return;
        }
        if (element instanceof HTMLImageElement) {
            await this.#addImage(element, opts);
        } else if (element instanceof HTMLVideoElement) {
            await this.#addVideo(element, opts);
        } else if (element instanceof HTMLCanvasElement) {
            if (isHicCanvas(element) && initialCapture) {
                await this.#addHICCanvas(element, opts, initialCapture);
            } else {
                await this.#addCanvas(element, opts);
            }
        } else {
            await this.#addText(element, opts);
        }
    }

    /**
     * Update the HIC texture for an html-in-canvas wrapper canvas.
     * @internal Used by VFXCanvas (@vfx-js/react).
     */
    updateHICTexture(
        canvas: HTMLCanvasElement,
        offscreen: OffscreenCanvas,
    ): void {
        this.#player.updateHICTexture(canvas, offscreen);
    }

    /**
     * True when the user prefers reduced motion, checked once at creation.
     * @internal Used by transitions.
     */
    get reducedMotion(): boolean {
        return this.#reducedMotion;
    }

    get maxTextureSize(): number {
        return this.#player.maxTextureSize;
    }

    /** The output canvas VFX renders into. */
    get canvas(): HTMLCanvasElement {
        return this.#canvas;
    }

    /**
     * Register an element using html-in-canvas API.
     * Wraps the element in a `<canvas layoutsubtree content="drawable">` and captures via drawElementImage.
     * Falls back to `add()` if html-in-canvas is not supported.
     */
    addHTML(element: HTMLElement, opts: VFXProps): Promise<void> {
        return this.#addHTML(element, opts, false);
    }

    /**
     * Like `addHTML`, and a still copy covers the frame before the first capture.
     * @internal Used by transitions.
     */
    addHTMLWithStill(element: HTMLElement, opts: VFXProps): Promise<void> {
        return this.#addHTML(element, opts, true);
    }

    async #addHTML(
        element: HTMLElement,
        opts: VFXProps,
        withStill: boolean,
    ): Promise<void> {
        if (this.#reducedMotion) {
            return;
        }
        if (this.#captures.has(element)) {
            throw new Error(
                "[VFX-JS] This element is captured. Dispose the capture before addHTML.",
            );
        }
        if (!supportsHtmlInCanvas()) {
            console.warn(
                "html-in-canvas not supported, falling back to dom-to-canvas",
            );
            return this.add(element, opts);
        }

        if (opts.overlay !== undefined) {
            console.warn(
                "addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.",
            );
        }

        const { overlay: _, ...hicOpts } = opts;

        let wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            this.#player.removeElement(wrapper);
        }

        this.#wrapping.add(element);
        let initialCapture: OffscreenCanvas;
        try {
            const wrapped = await wrapElement(element, {
                onCapture: (offscreen) => {
                    this.#player.updateHICTexture(wrapped.canvas, offscreen);
                },
                maxSize: this.#player.maxTextureSize,
                stillCover: withStill
                    ? { zIndex: this.#stillZIndex() }
                    : undefined,
            });
            wrapper = wrapped.canvas;
            initialCapture = wrapped.initialCapture;
            this.#wrapperCanvases.set(element, wrapper);
        } finally {
            this.#wrapping.delete(element);
        }

        await this.#addHICCanvas(wrapper, hicOpts, initialCapture);
    }

    /**
     * Capture an element as a texture without drawing it.
     * Any effect of this VFX instance can read the texture.
     * Resolves after the first capture is in the texture.
     *
     * `<img>`, `<video>` and `<canvas>` are uploaded as they are.
     * Other elements are captured with html-in-canvas when the browser
     * supports it (like {@link VFX.addHTML}), or else with one DOM snapshot
     * (like {@link VFX.add}). Call `update()` on the snapshot after the
     * element changes.
     *
     * ```ts
     * const page = await vfx.capture(article, { hide: true });
     * await vfx.add(minimap, {
     *     effect: myEffect,
     *     uniforms: { page: page.texture },
     * });
     * // Later:
     * page.dispose();
     * ```
     *
     * The texture works on the effect path (`effect`) only, and only in
     * this VFX instance.
     *
     * Rejects when the element already has a capture in this instance,
     * when `addHTML` or a transition wraps it, or when the first capture
     * fails.
     * When the user prefers reduced motion, it resolves to a handle that
     * leaves the element alone and samples as transparent.
     */
    async capture(
        source: HTMLElement,
        opts: VFXCaptureOpts = {},
    ): Promise<VFXCapture> {
        if (this.#reducedMotion) {
            return this.#inertCapture(source);
        }
        if (this.#destroyed) {
            throw new Error("[VFX-JS] This VFX instance is destroyed.");
        }
        if (this.#captures.has(source)) {
            throw new Error(
                "[VFX-JS] This element is already captured. Share the capture instead.",
            );
        }
        if (this.#wrapperCanvases.has(source) || this.#wrapping.has(source)) {
            throw new Error(
                "[VFX-JS] capture() cannot take an element that addHTML or a transition has wrapped.",
            );
        }

        // Register now, so a second call cannot wrap the element too.
        this.#captures.set(source, null);
        let capture: VFXCapture;
        try {
            capture = await this.#player.addCapture(
                source,
                opts,
                this.#stillZIndex(),
                () => this.#captures.delete(source),
            );
        } catch (err) {
            this.#captures.delete(source);
            throw err;
        }
        if (this.#destroyed) {
            capture.dispose();
            throw new Error(
                "[VFX-JS] This VFX instance was destroyed during capture().",
            );
        }
        this.#captures.set(source, capture);
        return capture;
    }

    #inertCapture(source: HTMLElement): VFXCapture {
        const r = source.getBoundingClientRect();
        return {
            texture: this.#player.emptyTexture(),
            rect: { x: r.left, y: r.top, width: r.width, height: r.height },
            update: () => Promise.resolve(),
            dispose: () => {},
        };
    }

    // One below the VFX canvas.
    #stillZIndex(): number {
        const zIndex = Number.parseInt(this.#canvas.style.zIndex, 10);
        return Number.isNaN(zIndex) ? 9998 : zIndex - 1;
    }

    async #addHICCanvas(
        canvas: HTMLCanvasElement,
        opts: VFXProps,
        initialCapture: OffscreenCanvas,
    ): Promise<void> {
        try {
            await this.#player.addElement(canvas, opts, initialCapture);
        } finally {
            // A frozen element shows its plain capture until the freeze ends.
            releaseFirstCapture(canvas, this.#player.isFrozen(canvas));
        }
    }

    /**
     * Animate an element from its old content to its new content with a
     * shader. The element is wrapped only while a run is in flight,
     * unless `keepWrapped` is set.
     *
     * ```ts
     * const t = vfx.addTransition(main, { duration: 0.6 });
     * await t.run(() => renderNextPage());
     * ```
     */
    addTransition<T extends Transition | TransitionClass>(
        element: HTMLElement,
        opts: AddTransitionOpts<T> = {},
    ): TransitionHandle {
        const transition = new TransitionController(this, element, opts, () =>
            this.#transitions.delete(transition),
        );
        this.#transitions.add(transition);
        return transition;
    }

    /**
     * Stop rendering VFX elements inside `root` and show their plain
     * content. Returns a function that undoes it.
     * @internal Used by transitions.
     */
    freezeInside(root: HTMLElement): () => void {
        return this.#player.freezeInside(root);
    }

    /**
     * Capture an html-in-canvas canvas into a texture on every paint.
     * The canvas is not rendered on screen. `texture` is null until the first capture.
     * @internal Used by transitions.
     */
    captureLive(canvas: HTMLCanvasElement): LiveCapture {
        if (!supportsHtmlInCanvas()) {
            return { texture: null, dispose: () => {} };
        }
        return captureLive(
            canvas,
            this.#player.liveTexture(),
            this.#player.maxTextureSize,
        );
    }

    /**
     * Pin the size of the element's html-in-canvas wrapper.
     * Returns a function that undoes it. No-op for other elements.
     * @internal Used by transitions.
     */
    lockSize(element: HTMLElement): () => void {
        const canvas = this.#wrapperCanvases.get(element);
        return canvas ? lockCanvasSize(canvas) : () => {};
    }

    /**
     * Keep rendering the element while it is off screen.
     * Returns a function that undoes it.
     * @internal Used by transitions.
     */
    forceRender(element: HTMLElement): () => void {
        const target = this.#wrapperCanvases.get(element) ?? element;
        return this.#player.forceRender(target);
    }

    /**
     * Remove the element from VFX and stop rendering the shader.
     */
    remove(element: HTMLElement): void {
        const wrapper = this.#wrapperCanvases.get(element);
        if (wrapper) {
            unwrapElement(wrapper, element);
            this.#wrapperCanvases.delete(element);
            this.#player.removeElement(wrapper);
        } else {
            this.#player.removeElement(element);
        }
    }

    /**
     * Replace the effect chain on an already-registered effect-path
     * element in-place. Effects whose reference is unchanged keep their
     * init state and GPU resources; only added/removed effects run
     * `init` / `dispose`. The element's source texture is preserved.
     *
     * Useful for live UIs that reorder or toggle effects without paying
     * the cost of `vfx.remove` + `vfx.add` (which reloads the source).
     */
    updateEffects(
        element: HTMLElement,
        effect: Effect | readonly Effect[],
    ): Promise<void> {
        if (this.#reducedMotion) {
            return Promise.resolve();
        }
        const target = this.#wrapperCanvases.get(element) ?? element;
        return this.#player.updateElementEffects(target, effect);
    }

    /**
     * Update the texture for the given element.
     *
     * For an `HTMLImageElement`, reloads its currently selected image URL
     * — call this after changing `img.src` or when responsive image
     * selection changes. Videos refresh automatically (no-op).
     * Otherwise re-snapshots the element's DOM subtree.
     * For html-in-canvas elements, resolves once the new capture is in
     * the texture, or after a short timeout.
     *
     * Useful for elements whose contents change (input, textarea, or an
     * `<img>` whose selected source swaps).
     */
    async update(element: HTMLElement): Promise<void> {
        await this.updateInTime(element);
    }

    /**
     * Like `update`, and resolves to false when an html-in-canvas capture timed out.
     * @internal Used by transitions.
     */
    async updateInTime(element: HTMLElement): Promise<boolean> {
        const wrapper = this.#wrapperCanvases.get(element);
        const hicCanvas =
            wrapper ?? (element instanceof HTMLCanvasElement ? element : null);
        const captured = hicCanvas ? requestCapture(hicCanvas) : undefined;
        if (captured) {
            return captured;
        }

        if (element instanceof HTMLImageElement) {
            await this.#player.updateImageElement(element);
        } else if (element instanceof HTMLCanvasElement) {
            this.#player.updateCanvasElement(element);
        } else {
            await this.#player.updateTextElement(element);
        }
        return true;
    }

    /**
     * Start rendering VFX.
     */
    play(): void {
        if (this.#reducedMotion) {
            return;
        }
        this.#player.play();
    }

    /**
     * Stop rendering VFX.
     * You can restart rendering by calling `VFX.play()` later.
     */
    stop(): void {
        this.#player.stop();
    }

    /**
     * Render the whole scene once, manually.
     * This is useful when you want to control the rendering timings manually by combining with `autoplay: false`.
     */
    render(): void {
        if (this.#reducedMotion) {
            return;
        }
        this.#player.render();
    }

    /**
     * Current virtual animation time in seconds (the value behind the
     * `time` uniform).
     */
    get time(): number {
        return this.#player.time;
    }

    /**
     * Pin the animation clock to an absolute time in seconds.
     *
     * The next `render()` uses the value verbatim, so `setTime(t); render()`
     * produces a deterministic frame — handy for scrubbing a timeline or
     * capturing stable snapshots (e.g. visual regression tests):
     *
     * ```ts
     * const vfx = new VFX({ autoplay: false });
     * await vfx.add(img, { effect });
     * vfx.setTime(1.5);
     * vfx.render();
     * ```
     *
     * Note: this drives `deltaTime` too, so a jump produces one large
     * `deltaTime` on the next frame. Time-only effects are unaffected, but
     * effects that integrate motion over `deltaTime` (particles, fluid,
     * datamosh) may jump — pause first (`timeScale = 0`) when scrubbing them.
     */
    setTime(time: number): void {
        this.#player.setTime(time);
    }

    /**
     * Playback rate of the animation clock.
     *
     * `1` is realtime, `0` pauses (frames still render), and negative
     * values run time backwards. Can be changed at any time.
     *
     * Note: `deltaTime` follows this rate, so it goes negative while
     * rewinding. Time-only effects handle that fine; effects that integrate
     * motion over `deltaTime` (particles, fluid, datamosh) are not designed
     * to run backwards and may behave unexpectedly.
     */
    get timeScale(): number {
        return this.#player.timeScale;
    }

    set timeScale(scale: number) {
        this.#player.timeScale = scale;
    }

    /**
     * Destroy VFX and stop rendering.
     */
    destroy(): void {
        this.#destroyed = true;
        for (const capture of [...this.#captures.values()]) {
            capture?.dispose();
        }
        this.#captures.clear();

        for (const transition of this.#transitions) {
            transition.destroy();
        }
        this.#transitions.clear();

        for (const [element, wrapper] of this.#wrapperCanvases) {
            unwrapElement(wrapper, element);
        }
        this.#wrapperCanvases.clear();

        this.#player.destroy();
        this.#canvas.remove();
    }

    #addImage(element: HTMLImageElement, opts: VFXProps): Promise<void> {
        if (element.complete) {
            return this.#player.addElement(element, opts);
        } else {
            return new Promise<void>((resolve) => {
                element.addEventListener(
                    "load",
                    () => {
                        this.#player.addElement(element, opts);
                        resolve();
                    },
                    { once: true },
                );
            });
        }
    }

    #addVideo(element: HTMLVideoElement, opts: VFXProps): Promise<void> {
        if (element.readyState >= 3) {
            return this.#player.addElement(element, opts);
        } else {
            return new Promise<void>((resolve) => {
                element.addEventListener(
                    "canplay",
                    () => {
                        this.#player.addElement(element, opts);
                        resolve();
                    },
                    { once: true },
                );
            });
        }
    }

    #addCanvas(element: HTMLCanvasElement, opts: VFXProps): Promise<void> {
        return this.#player.addElement(element, opts);
    }

    #addText(element: HTMLElement, opts: VFXProps): Promise<void> {
        return this.#player.addElement(element, opts);
    }
}
