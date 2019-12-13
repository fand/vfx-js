import * as React from "react";
import { useFrame } from "react-three-fiber";
import { VFXElement } from "./context";

export interface VFXCanvasProps {
    elements: VFXElement[];
}

export const VFXCanvas: React.FC<VFXCanvasProps> = props => {
    useFrame(({ gl }) => {
        gl.autoClear = false;

        props.elements.forEach(e => {
            if (!e.isInViewport) {
                return;
            }
            const rect = e.element.getBoundingClientRect();

            e.uniforms["time"].value += 0.03;
            e.uniforms["resolution"].value.x = rect.width; // TODO: use correct width, height
            e.uniforms["resolution"].value.y = rect.height;
            e.uniforms["offset"].value.x = rect.left;
            e.uniforms["offset"].value.y =
                window.innerHeight - rect.top - rect.height;

            gl.setViewport(
                rect.left,
                window.innerHeight - (rect.top + rect.height),
                rect.width,
                rect.height
            );
            gl.render(e.scene, e.camera);
        });
    });

    return null;
};

export default VFXCanvas;
