/// <reference types="lodash" />
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
    constructor(canvas: HTMLCanvasElement);
    resize: (() => Promise<void>) & import("lodash").Cancelable;
    scroll: () => void;
    rerender(e: VFXElement): Promise<void>;
    addElement(element: HTMLElement, opts?: VFXProps): Promise<void>;
    removeElement(element: HTMLElement): void;
    updateElement(): void;
    play(): void;
    stop(): void;
    playLoop: () => void;
}
