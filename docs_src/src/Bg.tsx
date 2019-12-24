import React, { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree, useResource } from "react-three-fiber";
import * as THREE from "three";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: -1,
    pointerEvents: "none"
};

function Ring() {
    const ref = useRef<THREE.Mesh>();

    const { scene } = useThree();

    scene.background = new THREE.Color(0x222222);

    useFrame(() => {
        const r = ref.current;
        if (r) {
            r.rotation.x += 0.01;
            r.rotation.y += 0.01;
        }
    });

    return (
        <mesh ref={ref} position={[2, 0, -10]}>
            <torusBufferGeometry attach="geometry" args={[13, 1, 2, 3]} />
            <meshNormalMaterial attach="material" />
        </mesh>
    );
}

function Particle({ geometry, material }: any) {
    let ref = useRef<THREE.Mesh>();

    let t = Math.random() * 100;
    let speed = 0.01 + Math.random() / 200;
    let factor = 20 + Math.random() * 100;
    let xFactor = -50 + Math.random() * 100;
    let yFactor = -50 + Math.random() * 100;
    let zFactor = -30 + Math.random() * 60;

    useFrame(() => {
        if (ref.current === undefined) {
            return;
        }

        const s = Math.cos(t);
        ref.current.scale.set(s, s, s);
        ref.current.rotation.set(s * 5, s * 5, s * 5);
        ref.current.position.set(xFactor, yFactor, zFactor);
    });

    return <mesh ref={ref} material={material} geometry={geometry} />;
}

function Swarm({ count }: { count: number }) {
    const light = useRef();
    const [geometryRef, geometry] = useResource();
    const [materialRef, material] = useResource();

    return (
        <>
            <pointLight
                ref={light}
                distance={50}
                intensity={1.5}
                color={new THREE.Color(0xffffff)}
            />
            <spotLight intensity={0.5} position={[10, 10, 40]} penumbra={1} />
            {/* <tetrahedronBufferGeometry ref={geometryRef} args={[0.8, 0]} /> */}
            <sphereBufferGeometry ref={geometryRef} args={[0.8, 0]} />
            <meshPhysicalMaterial ref={materialRef} />
            {/* <meshNormalMaterial ref={materialRef} /> */}
            {geometry &&
                new Array(count)
                    .fill(0)
                    .map((_, index) => (
                        <Particle
                            key={index}
                            material={material}
                            geometry={geometry}
                        />
                    ))}
        </>
    );
}

export default () => (
    <Canvas style={canvasStyle as any}>
        <Swarm count={300} />
        <Ring />
    </Canvas>
);
