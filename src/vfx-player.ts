import * as THREE from "three";
import dom2canvas from "./dom-to-canvas";
import { shaders, DEFAULT_VERTEX_SHADER } from "./constants";
import debounce from "lodash.debounce";
import GIFData from "./gif";

export interface VFXProps {
    shader?: string;
}

export type VFXElementType = "img" | "video" | "text";

export interface VFXElement {
    type: VFXElementType;
    isInViewport: boolean;
    element: HTMLElement;
    scene: THREE.Scene;
    uniforms: { [name: string]: THREE.IUniform };
    startTime: number;
    enterTime: number;
    isGif: boolean;
}

const gifFor = new Map<HTMLElement, GIFData>();

export default class VFXPlayer {
    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;
    isPlaying = false;
    pixelRatio = 2;
    elements: VFXElement[] = [];

    w = 0;
    h = 0;
    scrollX = 0;
    scrollY = 0;

    mouseX = 0;
    mouseY = 0;

    constructor(private canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
        this.renderer.autoClear = false;

        if (typeof window !== "undefined") {
            this.pixelRatio = window.devicePixelRatio;

            window.addEventListener("resize", this.resize);
            window.addEventListener("scroll", this.scroll, { passive: true });
            window.addEventListener("mousemove", this.mousemove);
        }
        this.resize();
        this.scroll();

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.set(0, 0, 1);
    }

    destroy(): void {
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.resize);
            window.removeEventListener("scroll", this.scroll);
            window.removeEventListener("mousemove", this.mousemove);
        }
    }

    resize = debounce(async () => {
        if (typeof window !== "undefined") {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.canvas.width = w;
            this.canvas.height = h;
            this.renderer.setSize(w, h);
            this.renderer.setPixelRatio(this.pixelRatio);
            this.w = w;
            this.h = h;

            // Update html2canvas result.
            // Render elements in viewport first, then render elements outside of the viewport.
            for (const e of this.elements) {
                if (e.type === "text" && e.isInViewport) {
                    await this.rerender(e);
                }
            }
            for (const e of this.elements) {
                if (e.type === "text" && !e.isInViewport) {
                    await this.rerender(e);
                }
            }
        }
    }, 50);

    scroll = (): void => {
        if (typeof window !== "undefined") {
            this.scrollX = window.scrollX;
            this.scrollY = window.scrollY;
        }
    };

    mousemove = (e: MouseEvent): void => {
        if (typeof window !== "undefined") {
            this.mouseX = e.clientX;
            this.mouseY = window.innerHeight - e.clientY;
        }
    };

    async rerender(e: VFXElement): Promise<void> {
        const srcTexture = e.uniforms["src"];
        try {
            e.element.style.setProperty("opacity", "1"); // TODO: Restore original opacity
            // const canvas = await html2canvas(e.element);
            const canvas = await dom2canvas(e.element);
            if (canvas.width === 0 || canvas.width === 0) {
                throw "omg";
            }
            e.element.style.setProperty("opacity", "0");

            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            srcTexture.value = texture;
        } catch (e) {
            console.error(e);
        }
    }

    public async addElement(
        element: HTMLElement,
        opts: VFXProps = {}
    ): Promise<void> {
        // Init opts
        const shaderName = opts.shader || "uvGradient";
        const shader = (shaders as any)[shaderName] || shaderName;

        const rect = element.getBoundingClientRect();
        const isInViewport = this.isRectInViewport(rect);

        // Create values for element types
        let texture: THREE.Texture;
        let type: VFXElementType;
        let isGif = false;
        if (element instanceof HTMLImageElement) {
            type = "img" as VFXElementType;
            isGif = !!element.src.match(/\.gif/i);

            if (isGif) {
                const gif = await GIFData.create(element.src, this.pixelRatio);
                gifFor.set(element, gif);
                texture = new THREE.Texture(gif.getCanvas());
            } else {
                texture = new THREE.Texture(element);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = new THREE.VideoTexture(element);
            type = "video" as VFXElementType;
        } else {
            // const canvas = await html2canvas(element);
            const canvas = await dom2canvas(element);
            texture = new THREE.Texture(canvas);
            type = "text" as VFXElementType;
        }

        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.needsUpdate = true;

        // Hide original element
        element.style.setProperty("opacity", "0");

        const uniforms = {
            src: { type: "t", value: texture },
            resolution: { type: "v2", value: new THREE.Vector2() },
            offset: { type: "v2", value: new THREE.Vector2() },
            time: { type: "f", value: 0.0 },
            enterTime: { type: "f", value: -1.0 },
            mouse: { type: "v2", value: new THREE.Vector2() }
        };

        const scene = new THREE.Scene();
        const geometry = new THREE.PlaneGeometry(2, 2);

        const material = new THREE.ShaderMaterial({
            vertexShader: DEFAULT_VERTEX_SHADER,
            fragmentShader: shader,
            transparent: true,
            uniforms
        });
        material.extensions = {
            derivatives: true,
            drawBuffers: true,
            fragDepth: true,
            shaderTextureLOD: true
        };

        scene.add(new THREE.Mesh(geometry, material));

        const now = Date.now() / 1000;
        const elem = {
            element,
            type,
            scene,
            uniforms,
            startTime: now,
            enterTime: isInViewport ? now : -1,
            isInViewport,
            isGif
        };

        this.elements.push(elem);
    }

    public removeElement(element: HTMLElement): void {
        const i = this.elements.findIndex(e => e.element === element);
        if (i !== -1) {
            this.elements.splice(i, 1);
        }
    }

    public updateElement(element: HTMLElement): Promise<void> {
        const i = this.elements.findIndex(e => e.element === element);
        if (i !== -1) {
            return this.rerender(this.elements[i]);
        }

        return Promise.reject();
    }

    public play(): void {
        this.isPlaying = true;
        this.playLoop();
    }

    public stop(): void {
        this.isPlaying = false;
    }

    playLoop = (): void => {
        const now = Date.now() / 1000;

        this.elements.forEach(e => {
            const rect = e.element.getBoundingClientRect();

            // Check intersection
            const isInViewport = this.isRectInViewport(rect);
            if (isInViewport && !e.isInViewport) {
                e.enterTime = now;
            }
            e.isInViewport = isInViewport;

            if (!e.isInViewport) {
                return;
            }
            e.uniforms["time"].value = now - e.startTime;
            e.uniforms["enterTime"].value =
                e.enterTime === -1 ? 0 : now - e.enterTime;
            e.uniforms["resolution"].value.x = rect.width * this.pixelRatio; // TODO: use correct width, height
            e.uniforms["resolution"].value.y = rect.height * this.pixelRatio;
            e.uniforms["offset"].value.x = rect.left * this.pixelRatio;
            e.uniforms["offset"].value.y =
                (window.innerHeight - rect.top - rect.height) * this.pixelRatio;
            e.uniforms["mouse"].value.x = this.mouseX * this.pixelRatio;
            e.uniforms["mouse"].value.y = this.mouseY * this.pixelRatio;

            if (gifFor.has(e.element)) {
                const gif = gifFor.get(e.element)!;
                gif.update();
            }

            if (e.type === "video" || e.isGif) {
                e.uniforms["src"].value.needsUpdate = true;
            }

            this.camera.lookAt(e.scene.position);
            this.renderer.setViewport(
                rect.left,
                window.innerHeight - (rect.top + rect.height),
                rect.width,
                rect.height
            );
            try {
                this.renderer.render(e.scene, this.camera);
            } catch (e) {
                console.error(e);
            }
        });

        if (this.isPlaying) {
            requestAnimationFrame(this.playLoop);
        }
    };

    isRectInViewport(rect: DOMRect): boolean {
        // TODO: Consider custom root element
        return (
            rect.left <= this.w &&
            rect.right >= 0 &&
            rect.top <= this.h &&
            rect.bottom >= 0
        );
    }
}
