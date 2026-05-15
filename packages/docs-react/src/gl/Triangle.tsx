import { RefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { isMobile } from "is-mobile";
import { SpringValue } from "@react-spring/web";

type TriangleProps = {
    scroll: SpringValue<number>;
};

function Triangle({ scroll }: TriangleProps) {
    const ref = useRef<Mesh>(null);

    const size = isMobile() ? 7 : 13;

    useFrame(() => {
        const r = ref.current;
        if (r === null) {
            return;
        }
        r.rotation.y += 0.004;
        r.rotation.z += 0.01;

        const s = scroll.get();
        r.position.set(0, s * 300 - 7, -15);
    });

    return (
        <mesh ref={ref}>
            <torusGeometry attach="geometry" args={[size, 1, 2, 3]} />
            <meshNormalMaterial attach="material" />
        </mesh>
    );
}

export default Triangle;
