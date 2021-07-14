import * as twgl from "twgl.js";
import dom2canvas from "./dom-to-canvas";
import { shaders, DEFAULT_VERTEX_SHADER_TWGL } from "./constants";
import GIFData from "./gif";
import { VFXProps, VFXElement, VFXElementType, VFXUniformValue } from "./types";

const gifFor = new Map<HTMLElement, GIFData>();
const canvasFor = new Map<WebGLTexture, HTMLCanvasElement>();

function getWebGLContext(
    canvas: HTMLCanvasElement
): WebGL2RenderingContext | WebGLRenderingContext {
    const gl2 = canvas.getContext("webgl2", { alpha: true, antialias: true });
    if (gl2) {
        gl2.getExtension("OES_standard_derivatives");
        gl2.getExtension("WEBGL_draw_buffers");
        gl2.getExtension("EXT_frag_depth");
        gl2.getExtension("EXT_shader_texture_lod");
        return gl2;
    }

    const gl1 = canvas.getContext("webgl", {
        alpha: true,
    });
    if (gl1) {
        gl1.getExtension("OES_standard_derivatives");
        gl1.getExtension("WEBGL_draw_buffers");
        gl1.getExtension("EXT_frag_depth");
        gl1.getExtension("EXT_shader_texture_lod");
        return gl1;
    }

    throw "Failed to initialize WebGL context";
}

function getTexture(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    src: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): WebGLTexture {
    return twgl.createTexture(gl, {
        src: src,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        flipY: 1,
        premultiplyAlpha: 1,
        wrap: gl.CLAMP_TO_EDGE,
    });
}

export default class VFXPlayer {
    gl: WebGL2RenderingContext | WebGLRenderingContext;
    bufferInfo: twgl.BufferInfo;

    isPlaying = false;
    pixelRatio = 2;
    elements: VFXElement[] = [];

    w = 0;
    h = 0;
    scrollX = 0;
    scrollY = 0;

    mouseX = 0;
    mouseY = 0;

    constructor(private canvas: HTMLCanvasElement, pixelRatio?: number) {
        this.gl = getWebGLContext(canvas);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        const arrays = {
            // full screen rectangle
            position: [
                -1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0,
            ],
        };

        this.bufferInfo = twgl.createBufferInfoFromArrays(this.gl, arrays);

        if (typeof window !== "undefined") {
            this.pixelRatio = pixelRatio || window.devicePixelRatio;

            window.addEventListener("resize", this.resize);
            window.addEventListener("scroll", this.scroll, {
                passive: true,
            });
            window.addEventListener("mousemove", this.mousemove);
        }
        this.resize();
        this.scroll();
    }

    destroy(): void {
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.resize);
            window.removeEventListener("scroll", this.scroll);
            window.removeEventListener("mousemove", this.mousemove);
        }
    }

    private updateCanvasSize(): void {
        if (typeof window !== "undefined") {
            const w = window.innerWidth;
            const h = window.innerHeight;

            if (w !== this.w || h !== this.h) {
                this.canvas.width = w * this.pixelRatio;
                this.canvas.height = h * this.pixelRatio;
                this.w = w;
                this.h = h;
            }
        }
    }

    private resize = async (): Promise<void> => {
        if (typeof window !== "undefined") {
            // Update dom2canvas result.
            // Render elements in viewport first, then render elements outside of the viewport.
            for (const e of this.elements) {
                if (e.type === "text" && e.isInViewport) {
                    const rect = e.element.getBoundingClientRect();
                    if (rect.width !== e.width || rect.height !== e.height) {
                        await this.rerenderTextElement(e);
                        e.width = rect.width;
                        e.height = rect.height;
                    }
                }
            }
            for (const e of this.elements) {
                if (e.type === "text" && !e.isInViewport) {
                    const rect = e.element.getBoundingClientRect();
                    if (rect.width !== e.width || rect.height !== e.height) {
                        await this.rerenderTextElement(e);
                        e.width = rect.width;
                        e.height = rect.height;
                    }
                }
            }
        }
    };

    private scroll = (): void => {
        if (typeof window !== "undefined") {
            this.scrollX = window.scrollX;
            this.scrollY = window.scrollY;
        }
    };

    private mousemove = (e: MouseEvent): void => {
        if (typeof window !== "undefined") {
            this.mouseX = e.clientX;
            this.mouseY = window.innerHeight - e.clientY;
        }
    };

    private async rerenderTextElement(e: VFXElement): Promise<void> {
        try {
            e.element.style.setProperty("opacity", "1"); // TODO: Restore original opacity

            const texture: WebGLTexture = e.uniforms["src"];
            const canvas = canvasFor.get(texture);
            if (!canvas) {
                throw "VFXElement not initialized correctly";
            }

            await dom2canvas(e.element, canvas);
            if (canvas.width === 0 || canvas.height === 0) {
                throw "omg";
            }

            twgl.setTextureFromElement(this.gl, texture, canvas);
            e.element.style.setProperty("opacity", "0");
        } catch (e) {
            console.error(e);
        }
    }

    async addElement(element: HTMLElement, opts: VFXProps = {}): Promise<void> {
        // Init opts
        const shaderName = opts.shader || "uvGradient";
        const shader = (shaders as any)[shaderName] || shaderName;

        const rect = element.getBoundingClientRect();
        const isInViewport = this.isRectInViewport(rect);

        // Create values for element types
        let texture: WebGLTexture;
        let type: VFXElementType;
        let isGif = false;
        if (element instanceof HTMLImageElement) {
            type = "img" as VFXElementType;
            isGif = !!element.src.match(/\.gif/i);

            if (isGif) {
                const gif = await GIFData.create(element.src, this.pixelRatio);
                gifFor.set(element, gif);
                texture = getTexture(this.gl, gif.getCanvas());
            } else {
                texture = getTexture(this.gl, element);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = getTexture(this.gl, element);
            type = "video" as VFXElementType;
        } else {
            const canvas = await dom2canvas(element);
            texture = getTexture(this.gl, canvas);
            canvasFor.set(texture, canvas);
            type = "text" as VFXElementType;
        }

        // Hide original element
        const opacity = type === "video" ? "0.0001" : "0"; // don't hide video element completely to prevent jank frames
        element.style.setProperty("opacity", opacity);

        const uniforms: { [name: string]: VFXUniformValue | WebGLTexture } = {
            src: texture,
            resolution: [0, 0],
            offset: [0, 0],
            time: 0.0,
            enterTime: -Infinity,
            leaveTime: -Infinity,
            mouse: [0, 0],
        };

        const uniformGenerators: {
            [name: string]: () => VFXUniformValue;
        } = {};

        if (opts.uniforms !== undefined) {
            const keys = Object.keys(opts.uniforms);
            for (const key of keys) {
                const value = opts.uniforms[key];
                if (typeof value === "function") {
                    (uniforms[key] = value()), (uniformGenerators[key] = value);
                } else {
                    uniforms[key] = value;
                }
            }
        }

        const programInfo = twgl.createProgramInfo(this.gl, [
            DEFAULT_VERTEX_SHADER_TWGL,
            shader,
        ]);

        const now = Date.now() / 1000;
        const elem = {
            type,
            element,
            isInViewport,
            width: rect.width,
            height: rect.height,
            uniforms,
            uniformGenerators,
            startTime: now,
            enterTime: isInViewport ? now : -1,
            leaveTime: Infinity,
            release: opts.release ?? 0,
            isGif,
            overflow: opts.overflow ?? false,
            programInfo,
        };

        this.elements.push(elem);
    }

    removeElement(element: HTMLElement): void {
        const i = this.elements.findIndex((e) => e.element === element);
        if (i !== -1) {
            const [e] = this.elements.splice(i, 1);
            canvasFor.delete(e.uniforms["src"]);
        }
    }

    updateTextElement(element: HTMLElement): Promise<void> {
        const i = this.elements.findIndex((e) => e.element === element);
        if (i !== -1) {
            return this.rerenderTextElement(this.elements[i]);
        }

        // Do nothing if the element is not found
        // This happens when addElement is still processing
        return Promise.resolve();
    }

    play(): void {
        this.isPlaying = true;
        this.playLoop();
    }

    stop(): void {
        this.isPlaying = false;
    }

    private playLoop = (): void => {
        const now = Date.now() / 1000;

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        // this.renderer.clear();

        // This must done every frame because iOS Safari doesn't fire
        // window resize event while the address bar is transforming.
        this.updateCanvasSize();

        for (const e of this.elements) {
            const rect = e.element.getBoundingClientRect();

            // Check intersection
            const isInViewport = this.isRectInViewport(rect);
            if (isInViewport && !e.isInViewport) {
                e.enterTime = now;
                e.leaveTime = Infinity;
            }
            if (!isInViewport && e.isInViewport) {
                e.leaveTime = now;
            }
            e.isInViewport = isInViewport;

            if (isInViewport && now - e.leaveTime > e.release) {
                return;
            }

            // Update uniforms
            e.uniforms["time"] = now - e.startTime;
            e.uniforms["enterTime"] =
                e.enterTime === -1 ? 0 : now - e.enterTime;
            e.uniforms["leaveTime"] =
                e.leaveTime === -1 ? 0 : now - e.leaveTime;
            e.uniforms["resolution"] = [
                rect.width * this.pixelRatio, // TODO: use correct width, height
                rect.height * this.pixelRatio,
            ];
            e.uniforms["offset"] = [
                rect.left * this.pixelRatio,
                (window.innerHeight - rect.top - rect.height) * this.pixelRatio,
            ];
            e.uniforms["mouse"] = [
                this.mouseX * this.pixelRatio,
                this.mouseY * this.pixelRatio,
            ];

            for (const [key, gen] of Object.entries(e.uniformGenerators)) {
                e.uniforms[key] = gen();
            }

            // Update GIF frame
            const gif = gifFor.get(e.element);
            if (gif !== undefined) {
                gif.update();
                twgl.setTextureFromElement(
                    this.gl,
                    e.uniforms["src"],
                    gif.getCanvas()
                );
            }

            if (e.type === "video") {
                twgl.setTextureFromElement(
                    this.gl,
                    e.uniforms["src"],
                    e.element
                );
            }

            // Set viewport
            if (e.overflow) {
                this.gl.viewport(0, 0, window.innerWidth, window.innerHeight);
            } else {
                this.gl.viewport(
                    rect.left,
                    window.innerHeight - (rect.top + rect.height),
                    rect.width,
                    rect.height
                );
            }

            // Render to viewport
            this.gl.useProgram(e.programInfo.program);
            twgl.setBuffersAndAttributes(
                this.gl,
                e.programInfo,
                this.bufferInfo
            );
            twgl.setUniforms(e.programInfo, e.uniforms);
            twgl.drawBufferInfo(this.gl, this.bufferInfo);
        }

        if (this.isPlaying) {
            requestAnimationFrame(this.playLoop);
        }
    };

    private isRectInViewport(rect: DOMRect): boolean {
        // TODO: Consider custom root element
        return (
            rect.left <= this.w &&
            rect.right >= 0 &&
            rect.top <= this.h &&
            rect.bottom >= 0
        );
    }
}
