"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("react");
const THREE = require("three");
const use_intersection_1 = require("use-intersection");
const context_1 = require("./context");
const util_1 = require("./util");
const constants_1 = require("./constants");
const VFXImg = props => {
    const { dispatch } = react_1.useContext(context_1.VFXContext);
    const id = react_1.useRef(util_1.createElementId());
    const ref = react_1.useRef(null);
    const isInViewport = use_intersection_1.useIntersection(ref);
    react_1.useEffect(() => {
        if (ref.current === null) {
            return;
        }
        ref.current.style.opacity = "0";
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
            vertexShader: constants_1.DEFAULT_VERTEX_SHADER,
            fragmentShader: constants_1.shaders.uvGradient,
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
    return React.createElement("img", Object.assign({ ref: ref }, props));
};
exports.default = VFXImg;
//# sourceMappingURL=image.js.map