"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("react");
const THREE = require("three");
const use_intersection_1 = require("use-intersection");
const context_1 = require("./context");
const util_1 = require("./util");
const text_canvas_1 = require("./text-canvas");
const html2canvas = require("html2canvas");
function getStyle(element) {
    if (typeof window !== "undefined") {
        return window.getComputedStyle(element, null);
    }
    return null;
}
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
const VFXText = props => {
    const { dispatch } = react_1.useContext(context_1.VFXContext);
    const id = react_1.useRef(util_1.createElementId());
    const ref = react_1.useRef(null);
    const isInViewport = use_intersection_1.useIntersection(ref);
    react_1.useEffect(() => {
        if (ref.current === null) {
            return;
        }
        const refStyle = getStyle(ref.current);
        const rect = ref.current.getBoundingClientRect();
        const imgUrl = text_canvas_1.textToImage(props.children, rect, refStyle);
        const texture = new THREE.TextureLoader().load(imgUrl);
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
            type: "img",
            scene,
            camera,
            uniforms,
            isInViewport
        };
        dispatch({ type: "ADD_ELEMENT", payload: elem });
        setTimeout(() => {
            if (ref.current == null) {
                return;
            }
            html2canvas(ref.current).then(canvas => {
                if (ref.current == null) {
                    return;
                }
                ref.current.style.opacity = "0";
                const url = canvas.toDataURL();
                const img = new Image();
                const texture = new THREE.Texture(img);
                img.onload = () => {
                    texture.needsUpdate = true;
                };
                img.src = url;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.format = THREE.RGBAFormat;
                uniforms.src.value = texture;
            });
        }, Math.random() * 1000 + 1000);
        return () => {
            dispatch({ type: "REMOVE_ELEMENT", payload: { id: id.current } });
        };
    }, [ref]);
    react_1.useEffect(() => {
        dispatch({
            type: "TOGGLE_ELEMENT",
            payload: { id: id.current, isInViewport }
        });
    }, [isInViewport]);
    return React.createElement("span", Object.assign({ ref: ref }, props));
};
exports.default = VFXText;
//# sourceMappingURL=text.js.map