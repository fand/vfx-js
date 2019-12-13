"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_three_fiber_1 = require("react-three-fiber");
exports.VFXCanvas = (props) => {
    react_three_fiber_1.useFrame(({ gl }) => {
        gl.autoClear = false;
        props.elements.forEach(e => {
            if (!e.isInViewport) {
                return;
            }
            const rect = e.element.getBoundingClientRect();
            e.uniforms['time'].value += 0.03;
            e.uniforms['resolution'].value.x = rect.width;
            e.uniforms['resolution'].value.y = rect.height;
            e.uniforms['offset'].value.x = rect.left;
            e.uniforms['offset'].value.y = window.innerHeight - rect.top - rect.height;
            gl.setViewport(rect.left, window.innerHeight - (rect.top + rect.height), rect.width, rect.height);
            gl.render(e.scene, e.camera);
        });
    });
    return null;
};
exports.default = exports.VFXCanvas;
//# sourceMappingURL=canvas.js.map