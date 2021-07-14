import twgl from "twgl.js";

export interface VFXProps {
    shader?: string;
    release?: number;
    uniforms?: VFXPropsUniforms;
    overflow?: boolean;
}

export type VFXPropsUniforms = {
    [name: string]: VFXPropsUniformValue | (() => VFXPropsUniformValue);
};

export type VFXPropsUniformValue =
    | number // float
    | [number, number] // vec2
    | [number, number, number] // vec3
    | [number, number, number, number]; // vec4

export type VFXElementType = "img" | "video" | "text";

export type VFXUniformValue = VFXPropsUniformValue | WebGLTexture;

export type VFXUniform = {
    value: VFXUniformValue;
    isChanged: boolean;
};

export interface VFXElement {
    type: VFXElementType;
    element: HTMLElement;
    isInViewport: boolean;
    width: number;
    height: number;
    programInfo: twgl.ProgramInfo;
    uniforms: { [name: string]: VFXUniform };
    uniformGenerators: { [name: string]: () => VFXPropsUniformValue };
    startTime: number;
    enterTime: number;
    leaveTime: number;
    release: number;
    isGif: boolean;
    overflow: boolean;
}
