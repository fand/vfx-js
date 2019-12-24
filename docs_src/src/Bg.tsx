import React, { useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree, useResource } from "react-three-fiber";
import { useWindowSize } from "react-use";
import * as THREE from "three";
import Asteroids from "./Asteroids";
import Effects from "./Effects";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: -1,
    pointerEvents: "none"
};

function Triangle() {
    const ref = useRef<THREE.Mesh>();

    const { width } = useWindowSize();
    const size = width < 768 ? 9 : 13;

    useFrame(() => {
        const r = ref.current;
        if (r == undefined) {
            return;
        }
        r.rotation.y += 0.004;
        r.rotation.z += 0.01;

        const scroll = window.scrollY / document.body.scrollHeight;
        r.position.set(0, scroll * 300 - 7, -15);
    });

    return (
        <mesh ref={ref}>
            <torusBufferGeometry attach="geometry" args={[size, 1, 2, 3]} />
            <meshNormalMaterial attach="material" />
        </mesh>
    );
}

function Bg() {
    const { scene, camera } = useThree();
    scene.background = new THREE.Color(0x222222);

    useFrame(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return;
        }

        const scroll = window.scrollY / document.body.scrollHeight;
        camera.rotation.set(-Math.PI * 0.1 - scroll * Math.PI * 0.45, 0, 0);
    });

    const light = useRef();

    return (
        <>
            <pointLight
                ref={light}
                distance={50}
                intensity={1.8}
                color={new THREE.Color(0xffffff)}
            />
            <spotLight intensity={0.5} position={[10, 10, 40]} penumbra={1} />

            <Asteroids count={1500} />
            <Triangle />
        </>
    );
}

export default () => (
    <Canvas style={canvasStyle as any}>
        <Effects />
        <Bg />
    </Canvas>
);
