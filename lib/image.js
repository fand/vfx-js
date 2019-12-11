"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("react");
const THREE = require("three");
const use_intersection_1 = require("use-intersection");
const context_1 = require("./context");
const util_1 = require("./util");
const VFXImg = (props) => {
    const { dispatch } = react_1.useContext(context_1.VFXContext);
    const id = react_1.useRef(util_1.createElementId());
    const ref = react_1.useRef(null);
    const isInViewport = use_intersection_1.useIntersection(ref);
    react_1.useEffect(() => {
        if (ref.current === null) {
            return;
        }
        const scene = new THREE.Scene();
        const quad = new THREE.PlaneGeometry();
        const material = new THREE.RawShaderMaterial();
        scene.add(new THREE.Mesh(quad, material));
        const elem = {
            id: id.current,
            element: ref.current,
            type: 'img',
            scene,
            material,
            isInViewport,
        };
        dispatch({ type: "ADD_ELEMENT", payload: elem });
        return () => {
            dispatch({ type: "REMOVE_ELEMENT", payload: { id: id.current } });
        };
    }, [ref]);
    react_1.useEffect(() => {
        dispatch({ type: "TOGGLE_ELEMENT", payload: { id: id.current, isInViewport } });
    }, [isInViewport]);
    return (React.createElement("img", Object.assign({ ref: ref }, props)));
};
exports.default = VFXImg;
//# sourceMappingURL=image.js.map