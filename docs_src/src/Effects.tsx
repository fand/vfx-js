import React, { useRef, useEffect } from "react";
import { extend, useThree, useFrame } from "react-three-fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";

extend({ EffectComposer, ShaderPass, RenderPass, UnrealBloomPass, FilmPass });

declare global {
    namespace JSX {
        interface IntrinsicElements {
            effectComposer: any;
            renderPass: any;
            unrealBloomPass: any;
            filmPass: any;
        }
    }
}

export default function Effects() {
    const composer = useRef<EffectComposer>();
    const { scene, gl, size, camera } = useThree();
    useEffect(() => {
        composer.current.setSize(size.width, size.height);
    }, [size]);
    useFrame(() => composer.current.render(), 2);

    return (
        <effectComposer ref={composer} args={[gl]}>
            <renderPass attachArray="passes" scene={scene} camera={camera} />
            <unrealBloomPass
                attachArray="passes"
                args={[undefined, 1.6, 1, 0]}
            />
            <filmPass attachArray="passes" args={[0.05, 0.5, 1500, false]} />
        </effectComposer>
    );
}
