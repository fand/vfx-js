"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("react");
const react_three_fiber_1 = require("react-three-fiber");
const context_1 = require("./context");
exports.VFXProvider = (props) => {
    const [state, dispatch] = react_1.useReducer(context_1.reducer, context_1.initialState);
    const elements = [];
    react_three_fiber_1.useFrame(({ gl, camera }) => {
        elements.forEach(e => {
            if (!e.isInViewport) {
                return;
            }
            const rect = e.element.getBoundingClientRect();
            console.log(rect);
            gl.render(e.scene, camera);
        });
    });
    const value = { state, dispatch };
    return (React.createElement(context_1.VFXContext.Provider, { value: value }, props.children));
};
exports.default = exports.VFXProvider;
//# sourceMappingURL=provider.js.map