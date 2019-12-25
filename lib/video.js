"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const react_1 = require("react");
const context_1 = require("./context");
const VFXVideo = props => {
    const player = react_1.useContext(context_1.VFXContext);
    const ref = react_1.useRef(null);
    const onLoadedData = react_1.useCallback(() => {
        var _a;
        if (ref.current === null) {
            return;
        }
        const shader = props.shader;
        (_a = player) === null || _a === void 0 ? void 0 : _a.addElement(ref.current, { shader });
        return () => {
            var _a;
            if (ref.current === null) {
                return;
            }
            (_a = player) === null || _a === void 0 ? void 0 : _a.removeElement(ref.current);
        };
    }, [props.shader, player]);
    return React.createElement("video", Object.assign({ ref: ref }, props, { onLoadedData: onLoadedData }));
};
exports.default = VFXVideo;
//# sourceMappingURL=video.js.map