import * as React from "react";
import { useState, useEffect, useRef, useContext } from "react";
import * as THREE from "three";
import { useIntersection } from "use-intersection";
import { VFXContext, VFXElementType } from "./context";
import { createElementId } from "./util";
import html2canvas from "./h2c-queued";
import { shaders, DEFAULT_VERTEX_SHADER } from "./constants";

function VFXElementFactory<T extends HTMLElement>(
    type: keyof React.ReactHTML
): React.FC<React.HTMLAttributes<T>> {
    const VFXElement: React.FC<React.HTMLAttributes<T>> = (
        props: React.HTMLAttributes<T>
    ) => {
        const { dispatch } = useContext(VFXContext);
        const id = useRef(createElementId());
        const ref = useRef<T>(null);
        const [isMounted, setIsMounted] = useState(false);
        const isInViewport = useIntersection(ref);

        // Create scene
        useEffect(() => {
            if (ref.current === null) {
                return;
            }

            html2canvas(ref.current).then(canvas => {
                if (ref.current == null) {
                    return;
                }
                ref.current.style.opacity = "0"; // hide original element

                const texture = new THREE.Texture(canvas);
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

                const camera = new THREE.OrthographicCamera(
                    -1,
                    1,
                    1,
                    -1,
                    0.1,
                    10
                );
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
                    type: "span" as VFXElementType,
                    scene,
                    camera,
                    uniforms,
                    isInViewport
                };

                dispatch({ type: "ADD_ELEMENT", payload: elem });

                setIsMounted(true);
            });

            return () => {
                dispatch({
                    type: "REMOVE_ELEMENT",
                    payload: { id: id.current }
                });
            };
        }, [ref]);

        // Update isInViewport
        useEffect(() => {
            dispatch({
                type: "TOGGLE_ELEMENT",
                payload: { id: id.current, isInViewport }
            });
        }, [isInViewport, isMounted]);

        return React.createElement(type, { ...props, ref });
    };

    return VFXElement;
}

export default VFXElementFactory;
