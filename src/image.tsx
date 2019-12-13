import * as React from "react";
import { useEffect, useRef, useContext } from "react";
import * as THREE from "three";
import { useIntersection } from "use-intersection";
import { VFXContext, VFXElementType } from "./context";
import { createElementId } from "./util";
import { shaders, DEFAULT_VERTEX_SHADER } from "./constants";

const VFXImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = props => {
    const { dispatch } = useContext(VFXContext);
    const id = useRef(createElementId());
    const ref = useRef<HTMLImageElement>(null);
    const isInViewport = useIntersection(ref);

    // Create scene
    useEffect(() => {
        if (ref.current === null) {
            return;
        }

        // Override alpha
        ref.current.style.opacity = "0";

        // const texture = new THREE.TextureLoader().load(ref.current.src);
        const texture = new THREE.Texture(ref.current);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.needsUpdate = true;

        const uniforms = {
            src: { type: "t", value: texture },
            resolution: { type: "v2", value: new THREE.Vector2() },
            offset: { type: "v2", value: new THREE.Vector2() },
            time: { type: "f", value: 0.0 }
        };

        const scene = new THREE.Scene();

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.set(0, 0, 1);
        camera.lookAt(scene.position);

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: DEFAULT_VERTEX_SHADER,
            fragmentShader: shaders.uvGradient,
            transparent: true,
            uniforms
        });

        material.extensions = {
            derivatives: true,
            drawBuffers: true,
            fragDepth: true,
            shaderTextureLOD: true
        };

        scene.add(new THREE.Mesh(geometry, material));

        const elem = {
            id: id.current,
            element: ref.current,
            type: "img" as VFXElementType,
            scene,
            camera,
            uniforms,
            isInViewport
        };

        dispatch({ type: "ADD_ELEMENT", payload: elem });

        return () => {
            dispatch({ type: "REMOVE_ELEMENT", payload: { id: id.current } });
        };
    }, [ref]);

    // Update isInViewport
    useEffect(() => {
        dispatch({
            type: "TOGGLE_ELEMENT",
            payload: { id: id.current, isInViewport }
        });
    }, [isInViewport]);

    return <img ref={ref} {...props} />;
};

export default VFXImg;
