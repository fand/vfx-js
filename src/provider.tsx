import * as React from "react";
import { useReducer } from "react";
import { Canvas } from "react-three-fiber";
import { VFXContext, reducer, initialState } from "./context";
import VFXCanvas from "./canvas";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999
};

export interface VFXProviderProps {
    children?: any; // 😣 https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27805
}

export const VFXProvider: React.FC<VFXProviderProps> = props => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = { state, dispatch };

    return (
        <>
            <Canvas style={canvasStyle as any}>
                <VFXCanvas elements={state.elements} />
            </Canvas>
            <VFXContext.Provider value={value}>
                {props.children}
            </VFXContext.Provider>
        </>
    );
};

export default VFXProvider;
