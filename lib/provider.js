"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const react_1 = require("react");
const context_1 = require("./context");
const vfx_player_1 = __importDefault(require("./vfx-player"));
const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    "z-index": 9999,
    "pointer-events": "none"
};
exports.VFXProvider = props => {
    const [player, setPlayer] = react_1.useState(null);
    const canvasRef = react_1.useRef(null);
    react_1.useEffect(() => {
        if (canvasRef.current == null) {
            const canvas = document.createElement("canvas");
            for (const [k, v] of Object.entries(canvasStyle)) {
                canvas.style.setProperty(k, v.toString());
            }
            document.body.appendChild(canvas);
            canvasRef.current = canvas;
        }
        const player = new vfx_player_1.default(canvasRef.current);
        setPlayer(player);
        player.play();
        return () => {
            var _a;
            player.stop();
            player.destroy();
            (_a = canvasRef.current) === null || _a === void 0 ? void 0 : _a.remove();
        };
    }, [canvasRef]);
    return (React.createElement(React.Fragment, null,
        React.createElement(context_1.VFXContext.Provider, { value: player }, props.children)));
};
exports.default = exports.VFXProvider;
//# sourceMappingURL=provider.js.map