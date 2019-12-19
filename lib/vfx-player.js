"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = __importStar(require("three"));
const h2c_queued_1 = __importDefault(require("./h2c-queued"));
const constants_1 = require("./constants");
const lodash_debounce_1 = __importDefault(require("lodash.debounce"));
const gif_1 = __importDefault(require("./gif"));
const gifFor = new Map();
class VFXPlayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.isPlaying = false;
        this.pixelRatio = 2;
        this.elements = [];
        this.w = 0;
        this.h = 0;
        this.scrollX = 0;
        this.scrollY = 0;
        this.resize = lodash_debounce_1.default(() => __awaiter(this, void 0, void 0, function* () {
            if (typeof window !== "undefined") {
                const w = window.innerWidth;
                const h = window.innerHeight;
                this.canvas.width = w;
                this.canvas.height = h;
                this.renderer.setSize(w, h);
                this.renderer.setPixelRatio(this.pixelRatio);
                this.w = w;
                this.h = h;
                for (const e of this.elements) {
                    if (e.type === "text" && e.isInViewport) {
                        yield this.rerender(e);
                    }
                }
                for (const e of this.elements) {
                    if (e.type === "text" && !e.isInViewport) {
                        yield this.rerender(e);
                    }
                }
            }
        }), 50);
        this.scroll = () => {
            this.scrollX = window.scrollX;
            this.scrollY = window.scrollY;
        };
        this.playLoop = () => {
            const viewport = {
                left: this.scrollX,
                right: this.scrollX + this.w,
                top: this.scrollY,
                bottom: this.scrollY + this.h
            };
            this.elements.forEach(e => {
                const rect = e.element.getBoundingClientRect();
                e.isInViewport =
                    rect.left >= viewport.left ||
                        rect.right <= viewport.right ||
                        rect.top >= viewport.top ||
                        rect.bottom <= viewport.bottom;
                if (!e.isInViewport) {
                    return;
                }
                e.uniforms["time"].value += 0.03;
                e.uniforms["resolution"].value.x = rect.width * this.pixelRatio;
                e.uniforms["resolution"].value.y = rect.height * this.pixelRatio;
                e.uniforms["offset"].value.x = rect.left * this.pixelRatio;
                e.uniforms["offset"].value.y =
                    (window.innerHeight - rect.top - rect.height) * this.pixelRatio;
                if (gifFor.has(e.element)) {
                    const gif = gifFor.get(e.element);
                    gif.update();
                }
                if (e.type === "video" || e.isGif) {
                    e.uniforms["src"].value.needsUpdate = true;
                }
                this.camera.lookAt(e.scene.position);
                this.renderer.setViewport(rect.left, window.innerHeight - (rect.top + rect.height), rect.width, rect.height);
                try {
                    this.renderer.render(e.scene, this.camera);
                }
                catch (_a) { }
            });
            if (this.isPlaying) {
                requestAnimationFrame(this.playLoop);
            }
        };
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
    rerender(e) {
        return __awaiter(this, void 0, void 0, function* () {
            const srcTexture = e.uniforms["src"];
            try {
                e.element.style.setProperty("opacity", "1");
                const canvas = yield h2c_queued_1.default(e.element);
                e.element.style.setProperty("opacity", "0");
                const texture = new THREE.Texture(canvas);
                texture.needsUpdate = true;
                srcTexture.value = texture;
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    addElement(element, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const shaderName = opts.shader || "uvGradient";
            const shader = constants_1.shaders[shaderName] || shaderName;
            const rect = element.getBoundingClientRect();
            let texture;
            let type;
            let isGif = false;
            if (element instanceof HTMLImageElement) {
                type = "img";
                isGif = !!element.src.match(/\.gif/i);
                if (isGif) {
                    const gif = yield gif_1.default.create(element.src, rect.width, rect.height);
                    gifFor.set(element, gif);
                    texture = new THREE.Texture(gif.getCanvas());
                }
                else {
                    texture = new THREE.Texture(element);
                }
            }
            else if (element instanceof HTMLVideoElement) {
                texture = new THREE.VideoTexture(element);
                type = "video";
            }
            else {
                const canvas = yield h2c_queued_1.default(element);
                texture = new THREE.Texture(canvas);
                type = "text";
            }
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.format = THREE.RGBAFormat;
            texture.needsUpdate = true;
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
                vertexShader: constants_1.DEFAULT_VERTEX_SHADER,
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
                isInViewport: true,
                isGif
            };
            this.elements.push(elem);
        });
    }
    removeElement(element) {
        const i = this.elements.findIndex(e => e.element === element);
        if (i !== -1) {
            this.elements.splice(i, 1);
        }
    }
    updateElement(element) {
        const i = this.elements.findIndex(e => e.element === element);
        if (i !== -1) {
            return this.rerender(this.elements[i]);
        }
        return Promise.reject();
    }
    play() {
        this.isPlaying = true;
        this.playLoop();
    }
    stop() {
        this.isPlaying = false;
    }
}
exports.default = VFXPlayer;
//# sourceMappingURL=vfx-player.js.map