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
