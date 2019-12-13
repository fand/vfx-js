"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("react");
const react_three_fiber_1 = require("react-three-fiber");
const context_1 = require("./context");
const canvas_1 = require("./canvas");
const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999,
    pointerEvents: "none"
};
exports.VFXProvider = props => {
    const [state, dispatch] = react_1.useReducer(context_1.reducer, context_1.initialState);
    const value = { state, dispatch };
    return (React.createElement(React.Fragment, null,
        React.createElement(react_three_fiber_1.Canvas, { style: canvasStyle },
            React.createElement(canvas_1.default, { elements: state.elements })),
        React.createElement(context_1.VFXContext.Provider, { value: value }, props.children)));
};
exports.default = exports.VFXProvider;
//# sourceMappingURL=provider.js.map