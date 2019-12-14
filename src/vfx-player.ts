import * as THREE from "three";
import html2canvas from "./h2c-queued";
import { shaders, DEFAULT_VERTEX_SHADER } from "./constants";
import debounce from "lodash.debounce";

export type VFXElementType = "img" | "span";

export interface VFXElement {
    type: VFXElementType;
    isInViewport: boolean;
    element: HTMLElement;
    scene: THREE.Scene;
    uniforms: { [name: string]: THREE.IUniform };
}

export default class VFXPlayer {
    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;
    isPlaying = false;
    pixelRatio = 2;
    elements: VFXElement[] = [];
    io: IntersectionObserver;

    constructor(private canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
        this.renderer.autoClear = false;

        if (typeof window !== "undefined") {
            window.addEventListener("resize", this.resize);
        }
        this.resize();

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.set(0, 0, 1);

        this.io = new IntersectionObserver(this.updateIntersection);
    }

    resize = debounce(async () => {
        if (typeof window !== "undefined") {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.canvas.width = w;
            this.canvas.height = h;
            this.renderer.setSize(w, h);
            this.renderer.setPixelRatio(this.pixelRatio);

            // Update html2canvas result.
            // Render elements in viewport first, then render elements outside of the viewport.
            for (const e of this.elements) {
                if (e.type !== "img" && e.isInViewport) {
                    await this.rerender(e);
                }
            }
            for (const e of this.elements) {
                if (e.type !== "img" && !e.isInViewport) {
                    await this.rerender(e);
                }
            }
        }
    }, 50);

    updateIntersection = async (ints: IntersectionObserverEntry[]) => {
        // TODO: unroll nested loop using Map<HTMLElement,VFXElement> etc.
        for (const int of ints) {
            for (const e of this.elements) {
                if (e.element === int.target) {
                    e.isInViewport = int.isIntersecting;
                }
            }
        }
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

    public async addElement(element: HTMLElement): Promise<void> {
        let texture: THREE.Texture;
        let type: VFXElementType;

        if (element instanceof HTMLImageElement) {
            texture = new THREE.Texture(element);
            type = "img" as VFXElementType;
        } else {
            const canvas = await html2canvas(element);
            texture = new THREE.Texture(canvas);
            type = "span" as VFXElementType;
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
            fragmentShader: shaders.uvGradient,
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
            isInViewport: true // TODO: Fix
        };

        this.elements.push(elem);
        this.io.observe(element);
    }

    public removeElement(element: HTMLElement) {
        const i = this.elements.findIndex(e => e.element === element);
        if (i !== -1) {
            this.elements.splice(i, 1);
            this.io.unobserve(element);
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
        this.elements.forEach(e => {
            if (!e.isInViewport) {
                return;
            }
            const rect = e.element.getBoundingClientRect();

            e.uniforms["time"].value += 0.03; // TODO: use correct time
            e.uniforms["resolution"].value.x = rect.width * this.pixelRatio; // TODO: use correct width, height
            e.uniforms["resolution"].value.y = rect.height * this.pixelRatio;
            e.uniforms["offset"].value.x = rect.left * this.pixelRatio;
            e.uniforms["offset"].value.y =
                (window.innerHeight - rect.top - rect.height) * this.pixelRatio;

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
