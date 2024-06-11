import THREE from "three";
import { ShaderPreset } from "./constants";

export interface VFXProps {
    /**
     * Shader code or preset name.
     */
    shader?: ShaderPreset | (string & NonNullable<unknown>);

    release?: number;
    uniforms?: VFXUniforms;

    /**
     * Allow shader outputs to oveflow the original element area.
     * If true, REACT-VFX will render the shader in fullscreen.
     * If number is specified, REACT-VFX adds paddings with the given value.
     *
     * You can also specify the overflow size for each direction like CSS's `padding` property.
     * If you pass an array, it will be parsed as the top, right, bottom and left overflow.
     * For example, `<VFXImg overflow={[0, 100, 200, 0]} />` will render the image with
     * 100px right padding and 200px bottom padding.
     *
     * If you pass an object like `<VFXImg overflow={{ top: 100 }} />`,
     * REACT-VFX will add paddings only to the given direction (only to the `top` in this example).
     */
    overflow?:
        | true
        | number
        | [top: number, right: number, bottom: number, left: number]
        | { top?: number; right?: number; bottom?: number; left?: number };
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
    overflow: VFXElementOverflow;
    originalOpacity: number;
}

export type VFXElementOverflow =
    | "fullscreen"
    | { top: number; right: number; bottom: number; left: number };
