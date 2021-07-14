import twgl from "twgl.js";

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
    programInfo: twgl.ProgramInfo;
    vao: twgl.VertexArrayInfo;
    uniforms: { [name: string]: VFXUniformValue | WebGLTexture };
    uniformGenerators: { [name: string]: () => VFXUniformValue };
    startTime: number;
    enterTime: number;
    leaveTime: number;
    release: number;
    isGif: boolean;
    overflow: boolean;
}
