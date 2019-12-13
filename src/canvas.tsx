import * as React from "react";
import { useFrame } from "react-three-fiber";
import { VFXElement } from "./context";

export interface VFXCanvasProps {
    elements: VFXElement[];
}

const pixelRatio = 1;

export const VFXCanvas: React.FC<VFXCanvasProps> = props => {
    useFrame(({ gl }) => {
        gl.autoClear = false;
        gl.setPixelRatio(pixelRatio);

        props.elements.forEach(e => {
            if (!e.isInViewport) {
                return;
            }
            const rect = e.element.getBoundingClientRect();

            e.uniforms["time"].value += 0.03;
            e.uniforms["resolution"].value.x = rect.width * pixelRatio; // TODO: use correct width, height
            e.uniforms["resolution"].value.y = rect.height * pixelRatio;
            e.uniforms["offset"].value.x = rect.left * pixelRatio;
            e.uniforms["offset"].value.y =
                (window.innerHeight - rect.top - rect.height) * pixelRatio;

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
