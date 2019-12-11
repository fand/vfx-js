import { Dispatch } from 'react';
export declare type VFXElementType = "img" | "span";
export interface VFXElement {
    id: number;
    type: VFXElementType;
    isInViewport: boolean;
    element: HTMLElement;
    scene: THREE.Scene;
    material: THREE.Material;
}
export interface VFXElementsState {
    elements: VFXElement[];
}
export interface VFXState {
    state: VFXElementsState;
    dispatch: Dispatch<Action>;
}
export declare const initialState: VFXElementsState;
export declare type Action = {
    type: "ADD_ELEMENT";
    payload: VFXElement;
} | {
    type: "REMOVE_ELEMENT";
    payload: {
        id: number;
    };
} | {
    type: "TOGGLE_ELEMENT";
    payload: {
        id: number;
        isInViewport: boolean;
    };
};
export declare function reducer(state: VFXElementsState, action: Action): VFXElementsState;
export declare const VFXContext: import("react").Context<VFXState>;
