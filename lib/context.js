"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
exports.initialState = {
    elements: [],
};
function reducer(state, action) {
    if (process.env.NODE_ENV !== "production") {
        console.log(">> action", action);
    }
    switch (action.type) {
        case "ADD_ELEMENT": {
            return Object.assign(Object.assign({}, state), { elements: state.elements.concat(action.payload) });
        }
        case "REMOVE_ELEMENT": {
            const newElements = state.elements.filter(e => e.id !== action.payload.id);
            return Object.assign(Object.assign({}, state), { elements: newElements });
        }
        case "TOGGLE_ELEMENT": {
            const newElements = [...state.elements];
            for (const e of newElements) {
                if (e.id === action.payload.id) {
                    e.isInViewport = action.payload.isInViewport;
                }
            }
            return Object.assign(Object.assign({}, state), { elements: newElements });
        }
        default: {
            return state;
        }
    }
}
exports.reducer = reducer;
exports.VFXContext = react_1.createContext({});
//# sourceMappingURL=context.js.map