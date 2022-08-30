import { useRef, useEffect, useState, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { isMobile } from "is-mobile";
import { BufferGeometry, Material } from "three";

function randomRange(min: number, max: number): number {
    const diff = max - min;
    return Math.random() * diff + min;
}

function Particle({ geometry, material }: any) {
    const ref = useRef<THREE.Mesh>(null);

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

    const size = isMobile() ? 18 : 12;

    useEffect(() => {
        if (ref.current === null) {
            return;
        }

        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const sz = Math.random() * size;
        ref.current.scale.set(sx, sy, sz);

        const a = Math.floor(sx * 900) * Math.PI * 0.5;
        ref.current.rotation.set(a, a, a);

        ref.current.position.set(x, y, z);
    }, [size, x, y, z]);

    return <mesh ref={ref} material={material} geometry={geometry} />;
}

type FragmentsProps = {
    count: number;
    scroll: RefObject<number>;
};

function Fragments({ count, scroll }: FragmentsProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
    const [material, setMaterial] = useState<Material | null>(null);

    useFrame(() => {
        if (groupRef.current === null) {
            return;
        }
        if (typeof window === "undefined") {
            return;
        }

        const s = scroll.current ?? 0;
        groupRef.current.position.set(0, s * 100 - 50, 0);
        groupRef.current.rotation.set(0, Date.now() / 8000 + s * 5, 0);
    });

    return (
        <>
            <boxBufferGeometry ref={setGeometry} args={[0.00001, 1, 1]} />
            <meshDepthMaterial ref={setMaterial} />
            <group ref={groupRef}>
                {geometry &&
                    material &&
                    new Array(count)
                        .fill(0)
                        .map((_, index) => (
                            <Particle
                                key={index}
                                material={material}
                                geometry={geometry}
                            />
                        ))}
            </group>
        </>
    );
}

export default Fragments;
