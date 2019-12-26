export interface VFXProps {
    shader?: string;
}

export type VFXElementType = "img" | "video" | "text";

export interface VFXElement {
    type: VFXElementType;
    element: HTMLElement;
    isInViewport: boolean;
    width: number;
    height: number;
    scene: THREE.Scene;
    uniforms: { [name: string]: THREE.IUniform };
    startTime: number;
    enterTime: number;
    isGif: boolean;
}
