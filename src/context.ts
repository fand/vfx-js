import { createContext, Dispatch } from "react";

export type VFXElementType = "img" | "span";

export interface VFXElement {
    id: number;
    type: VFXElementType;
    isInViewport: boolean;
    element: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.Camera;
    uniforms: { [name: string]: THREE.IUniform };
}

export interface VFXElementsState {
    elements: VFXElement[];
}

export interface VFXState {
    state: VFXElementsState;
    dispatch: Dispatch<Action>;
}

export const initialState: VFXElementsState = {
    elements: []
};

export type Action =
    | { type: "ADD_ELEMENT"; payload: VFXElement }
    | { type: "REMOVE_ELEMENT"; payload: { id: number } }
    | {
          type: "TOGGLE_ELEMENT";
          payload: { id: number; isInViewport: boolean };
      };

export function reducer(
    state: VFXElementsState,
    action: Action
): VFXElementsState {
    if (process.env.NODE_ENV !== "production") {
        console.log(">> action", action);
    }

    switch (action.type) {
        case "ADD_ELEMENT": {
            return {
                ...state,
                elements: state.elements.concat(action.payload)
            };
        }
        case "REMOVE_ELEMENT": {
            const newElements = state.elements.filter(
                e => e.id !== action.payload.id
            );
            return {
                ...state,
                elements: newElements
            };
        }
        case "TOGGLE_ELEMENT": {
            const newElements = [...state.elements];
            for (const e of newElements) {
                if (e.id === action.payload.id) {
                    e.isInViewport = action.payload.isInViewport;
                }
            }

            return {
                ...state,
                elements: newElements
            };
        }
        default: {
            return state;
        }
    }
}

// eslint-disable-next-line
export const VFXContext = createContext<VFXState>({} as any);
