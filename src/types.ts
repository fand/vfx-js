import THREE from "three";

export interface VFXProps {
    shader?: string;
    release?: number;
    uniforms?: VFXUniforms;
    overflow?: boolean;
}

export type VFXUniforms = {
    [name: string]: VFXUniformValue | (() => VFXUniformValue);
};

export type VFXUniformValue =
    | number // float
    | [number, number] // vec2
    | [number, number, number] // vec3
    | [number, number, number, number]; // vec4

export type VFXElementType = "img" | "video" | "text";

export interface VFXElement {
    type: VFXElementType;
    element: HTMLElement;
    isInViewport: boolean;
    width: number;
    height: number;
    scene: THREE.Scene;
    uniforms: { [name: string]: THREE.IUniform };
    uniformGenerators: { [name: string]: () => VFXUniformValue };
    startTime: number;
    enterTime: number;
    leaveTime: number;
    release: number;
    isGif: boolean;
    overflow: boolean;
}
