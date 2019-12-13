import * as React from "react";
import { useState, useEffect, useRef, useContext } from "react";
import * as THREE from "three";
import { useIntersection } from "use-intersection";
import { VFXContext, VFXElementType } from "./context";
import { createElementId } from "./util";
import html2canvas from "./h2c-queued";

const DEFAULT_VERTEX_SHADER = `
precision mediump float;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fs = `
precision mediump float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    gl_FragColor = vec4(uv, sin(time) * .5 + .5, 1);
    gl_FragColor *= 1. - smoothstep(0., 1., texture2D(src, uv).r);
}
`;

const VFXText: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = props => {
    const { dispatch } = useContext(VFXContext);
    const id = useRef(createElementId());
    const ref = useRef<HTMLImageElement>(null);
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
            // uniforms.src.value = texture;

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
                fragmentShader: fs,
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

            setIsMounted(true);
        });

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
    }, [isInViewport, isMounted]);

    return <span ref={ref} {...props} />;
};

export default VFXText;
