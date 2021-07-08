import React, { useRef, useEffect } from "react";
import { extend, useThree, useFrame } from "react-three-fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

extend({
    EffectComposer,
    ShaderPass,
    RenderPass
});

export default function Effects() {
    const composer = useRef<EffectComposer>();
    const { scene, gl, size, camera } = useThree();

    useEffect(() => {
        if (composer.current === undefined) {
            return;
        }

        composer.current.setSize(size.width, size.height);
    }, [size]);

    useFrame(() => {
        if (composer.current === undefined) {
            return;
        }

        composer.current.render();
    }, 2);

    return (
        <effectComposer ref={composer} args={[gl]}>
            <renderPass attachArray="passes" scene={scene} camera={camera} />
            <shaderPass
                attachArray="passes"
                args={[FXAAShader]}
                material-uniforms-resolution-value={[
                    1 / size.width,
                    1 / size.height
                ]}
                renderToScreen
            />
        </effectComposer>
    );
}
