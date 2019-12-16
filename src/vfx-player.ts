import * as THREE from "three";
import html2canvas from "./h2c-queued";
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

    constructor(private canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
        this.renderer.autoClear = false;

        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.resize);
            window.addEventListener("scroll", this.scroll, { passive: true });
        }
        this.resize();
        this.scroll();

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.set(0, 0, 1);
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

    scroll = () => {
        this.scrollX = window.scrollX;
        this.scrollY = window.scrollY;
    };

    async rerender(e: VFXElement) {
        const srcTexture = e.uniforms["src"];

        e.element.style.setProperty("opacity", "1"); // TODO: Restore original opacity
        const canvas = await html2canvas(e.element);
        e.element.style.setProperty("opacity", "0");

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        srcTexture.value = texture;
    }

    public async addElement(
        element: HTMLElement,
        opts: VFXProps = {}
    ): Promise<void> {
        // Init opts
        const shaderName = opts.shader || "uvGradient";
        const shader = (shaders as any)[shaderName] || shaders.uvGradient;

        const rect = element.getBoundingClientRect();

        // Create values for element types
        let texture: THREE.Texture;
        let type: VFXElementType;
        let isGif = false;
        if (element instanceof HTMLImageElement) {
            type = "img" as VFXElementType;
            isGif = !!element.src.match(/\.gif/i);

            if (isGif) {
                const gif = await GIFData.create(
                    element.src,
                    rect.width,
                    rect.height
                );
                gifFor.set(element, gif);
                texture = new THREE.Texture(gif.getCanvas());
            } else {
                texture = new THREE.Texture(element);
            }
        } else if (element instanceof HTMLVideoElement) {
            texture = new THREE.VideoTexture(element);
            type = "video" as VFXElementType;
        } else {
            const canvas = await html2canvas(element);
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
            time: { type: "f", value: 0.0 }
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

        const elem = {
            element,
            type,
            scene,
            uniforms,
            isInViewport: true, // TODO: Fix
            isGif
        };

        this.elements.push(elem);
    }

    public removeElement(element: HTMLElement) {
        const i = this.elements.findIndex(e => e.element === element);
        if (i !== -1) {
            this.elements.splice(i, 1);
        }
    }

    public updateElement() {
        // TODO: implement
    }

    public play() {
        this.isPlaying = true;
        this.playLoop();
    }

    public stop() {
        this.isPlaying = false;
    }

    playLoop = () => {
        const viewport = {
            left: this.scrollX,
            right: this.scrollX + this.w,
            top: this.scrollY,
            bottom: this.scrollY + this.h
        };

        this.elements.forEach(e => {
            const rect = e.element.getBoundingClientRect();

            // Check intersection
            e.isInViewport =
                rect.left >= viewport.left ||
                rect.right <= viewport.right ||
                rect.top >= viewport.top ||
                rect.bottom <= viewport.bottom;
            if (!e.isInViewport) {
                return;
            }

            e.uniforms["time"].value += 0.03; // TODO: use correct time
            e.uniforms["resolution"].value.x = rect.width * this.pixelRatio; // TODO: use correct width, height
            e.uniforms["resolution"].value.y = rect.height * this.pixelRatio;
            e.uniforms["offset"].value.x = rect.left * this.pixelRatio;
            e.uniforms["offset"].value.y =
                (window.innerHeight - rect.top - rect.height) * this.pixelRatio;

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
            this.renderer.render(e.scene, this.camera);
        });

        if (this.isPlaying) {
            requestAnimationFrame(this.playLoop);
        }
    };
}
