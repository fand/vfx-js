import React, {
    useEffect,
    useCallback,
    createRef,
    MutableRefObject,
    useRef,
    useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { isMobile } from "is-mobile";
import * as THREE from "three";
import Triangle from "./gl/Triangle";
import Fragments from "./gl/Fragments";
import Effects from "./gl/Effects";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: -1,
    pointerEvents: "none",
};

const Bg: React.VFC = () => {
    const { scene, camera } = useThree();
    scene.background = new THREE.Color(0x222222);

    const top = createRef() as MutableRefObject<number>;

    const onScroll = useCallback(() => {
        const scroll = window.scrollY;

        if (typeof window === "undefined" || typeof document === "undefined") {
            return 0;
        }
        if (typeof scroll !== "number") {
            return 0;
        }

        top.current =
            scroll / (document.body.scrollHeight - window.innerHeight);
    }, [top]);

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return;
        }
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, [onScroll]);

    useFrame(() => {
        const s = top.current ?? 0;
        camera.rotation.set(-Math.PI * 0.1 - s * Math.PI * 0.4, 0, 0);
    });

    return (
        <>
            <Triangle scroll={top} />
            <Fragments count={isMobile() ? 800 : 1500} scroll={top} />
        </>
    );
};

function Box(props: any) {
    // This reference gives us direct access to the THREE.Mesh object
    const ref = useRef<THREE.Mesh>(null);
    // Hold state for hovered and clicked events
    const [hovered, hover] = useState(false);
    const [clicked, click] = useState(false);
    // Subscribe this component to the render-loop, rotate the mesh every frame
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x += 0.01;
        }
    });
    // Return the view, these are regular Threejs elements expressed in JSX
    return (
        <mesh
            {...props}
            ref={ref}
            scale={clicked ? 1.5 : 1}
            onClick={(event) => click(!clicked)}
            onPointerOver={(event) => hover(true)}
            onPointerOut={(event) => hover(false)}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
        </mesh>
    );
}

const BG: React.VFC = () => (
    <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Box position={[-1.2, 0, 0]} />
        <Box position={[1.2, 0, 0]} />
        {/* <Effects />
        <Bg /> */}
    </Canvas>
);

export default BG;
