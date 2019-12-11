import * as React from "react";
import { useReducer } from "react";
import { useFrame } from 'react-three-fiber';
import { VFXContext, VFXElement, reducer, initialState } from './context';

export interface VFXProviderProps {
    children: any; // 😣 https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27805
}

export const VFXProvider: React.FC<VFXProviderProps> = (props) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    const elements: VFXElement[] = [];
    useFrame(({ gl, camera }) => {
        elements.forEach(e => {
            if (!e.isInViewport) { return; }
            const rect = e.element.getBoundingClientRect();
            console.log(rect);

            gl.render(e.scene, camera);
        })
    });

    const value = { state, dispatch };

    return (
        <VFXContext.Provider value={value}>{props.children}</VFXContext.Provider>
    );
};

export default VFXProvider;
