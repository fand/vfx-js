"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_three_fiber_1 = require("react-three-fiber");
exports.VFXCanvas = props => {
    react_three_fiber_1.useFrame(({ gl }) => {
        gl.autoClear = false;
        gl.setPixelRatio(pixelRatio);
        props.elements.forEach(e => {
            if (!e.isInViewport) {
                return;
            }
            const rect = e.element.getBoundingClientRect();
            e.uniforms["time"].value += 0.03;
            e.uniforms["resolution"].value.x = rect.width * pixelRatio;
            e.uniforms["resolution"].value.y = rect.height * pixelRatio;
            e.uniforms["offset"].value.x = rect.left * pixelRatio;
            e.uniforms["offset"].value.y =
                (window.innerHeight - rect.top - rect.height) * pixelRatio;
            gl.setViewport(rect.left, window.innerHeight - (rect.top + rect.height), rect.width, rect.height);
            gl.render(e.scene, e.camera);
        });
    });
    return null;
};
exports.default = exports.VFXCanvas;
//# sourceMappingURL=canvas.js.map