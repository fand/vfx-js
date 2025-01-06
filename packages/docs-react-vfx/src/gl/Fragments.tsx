import { useRef, useEffect, useState, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { isMobile } from "is-mobile";
import { Object3D, Group, InstancedMesh } from "three";
import { SpringValue } from "@react-spring/web";

function randomRange(min: number, max: number): number {
    const diff = max - min;
    return Math.random() * diff + min;
}

function Particles({ count }: { count: number }) {
    const ref = useRef<InstancedMesh>(null);
    const size = isMobile() ? 18 : 12;

    useEffect(() => {
        if (ref.current === null) {
            return;
        }

        // Set positions
        const temp = new Object3D();
        for (let i = 0; i < count; i++) {
            const sx = Math.random() * size;
            const sy = Math.random() * size;
            const sz = Math.random() * size;
            temp.scale.set(sx, sy, sz);

            const a = Math.floor(sx * 900) * Math.PI * 0.5;
            temp.rotation.set(a, a, a);

            let x = randomRange(-50, 50);
            let y = randomRange(-140, 100);
            let z = randomRange(-50, 50);

            let d = Math.sqrt(x * x + z * z);
            const r = 30;
            if (d < r) {
                x *= r / d;
                z *= r / d;
                d = 30;
            }

            temp.position.set(x, y, z);

            temp.updateMatrix();
            ref.current.setMatrixAt(i, temp.matrix);
        }

        // Update the instance
        ref.current.instanceMatrix.needsUpdate = true;
    }, []);

    return (
        <instancedMesh
            ref={ref}
            args={[undefined, undefined, count]}
            frustumCulled={false}
        >
            <boxGeometry args={[0.00001, 1, 1]} />
            <meshDepthMaterial />
        </instancedMesh>
    );
}

type FragmentsProps = {
    count: number;
    scroll: SpringValue<number>;
};

function Fragments({ count, scroll }: FragmentsProps) {
    const groupRef = useRef<Group>(null);

    useFrame(() => {
        if (groupRef.current === null) {
            return;
        }
        if (typeof window === "undefined") {
            return;
        }

        const s = scroll.get();
        groupRef.current.position.set(0, s * 100 - 50, 0);
        groupRef.current.rotation.set(0, Date.now() / 8000 + s * 5, 0);
    });

    return (
        <>
            <group ref={groupRef}>
                <Particles count={count} />
            </group>
        </>
    );
}

export default Fragments;
