import React, { useRef } from "react";
import { useFrame } from "react-three-fiber";
import * as THREE from "three";
import { OpaqueInterpolation } from "react-spring";
import { isMobile } from "is-mobile";

type TriangleProps = {
    scroll: OpaqueInterpolation<number>;
};

function Triangle({ scroll }: TriangleProps) {
    const ref = useRef<THREE.Mesh>();

    const size = isMobile() ? 7 : 13;

    useFrame(() => {
        const r = ref.current;
        if (r === undefined) {
            return;
        }
        r.rotation.y += 0.004;
        r.rotation.z += 0.01;

        r.position.set(0, scroll.getValue() * 300 - 7, -15);
    });

    return (
        <mesh ref={ref}>
            <torusBufferGeometry attach="geometry" args={[size, 1, 2, 3]} />
            <meshNormalMaterial attach="material" />
        </mesh>
    );
}

export default Triangle;
