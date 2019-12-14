/// <reference types="lodash" />
import * as THREE from 'three';
export declare type VFXElementType = "img" | "span";
export interface VFXElement {
    type: VFXElementType;
    isInViewport: boolean;
    element: HTMLElement;
    scene: THREE.Scene;
    uniforms: {
        [name: string]: THREE.IUniform;
    };
}
export default class VFXPlayer {
    private canvas;
    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;
    isPlaying: boolean;
    pixelRatio: number;
    elements: VFXElement[];
    constructor(canvas: HTMLCanvasElement);
    resize: (() => Promise<void>) & import("lodash").Cancelable;
    addElement(element: HTMLElement): Promise<void>;
    removeElement(element: HTMLElement): void;
    updateElement(): void;
    play(): void;
    stop(): void;
    playLoop: () => void;
}
