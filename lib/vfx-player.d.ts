import * as THREE from "three";
export interface VFXProps {
    shader?: string;
}
export declare type VFXElementType = "img" | "video" | "text";
export interface VFXElement {
    type: VFXElementType;
    isInViewport: boolean;
    element: HTMLElement;
    scene: THREE.Scene;
    uniforms: {
        [name: string]: THREE.IUniform;
    };
    startTime: number;
    enterTime: number;
    isGif: boolean;
}
export default class VFXPlayer {
    private canvas;
    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;
    isPlaying: boolean;
    pixelRatio: number;
    elements: VFXElement[];
    w: number;
    h: number;
    scrollX: number;
    scrollY: number;
    mouseX: number;
    mouseY: number;
    constructor(canvas: HTMLCanvasElement);
    destroy(): void;
    updateCanvasSize(): void;
    resize: () => Promise<void>;
    scroll: () => void;
    mousemove: (e: MouseEvent) => void;
    rerender(e: VFXElement): Promise<void>;
    addElement(element: HTMLElement, opts?: VFXProps): Promise<void>;
    removeElement(element: HTMLElement): void;
    updateElement(element: HTMLElement): Promise<void>;
    play(): void;
    stop(): void;
    playLoop: () => void;
    isRectInViewport(rect: DOMRect): boolean;
}
