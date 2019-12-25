import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { VFXContext } from "./context";
import VFXPlayer from "./vfx-player";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    "z-index": 9999,
    "pointer-events": "none"
};

export interface VFXProviderProps {
    children?: any; // 😣 https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27805
    pixelRatio?: number;
}

export const VFXProvider: React.FC<VFXProviderProps> = props => {
    const [player, setPlayer] = useState<VFXPlayer | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (canvasRef.current == null) {
            const canvas = document.createElement("canvas");
            for (const [k, v] of Object.entries(canvasStyle)) {
                canvas.style.setProperty(k, v.toString());
            }
            document.body.appendChild(canvas);

            canvasRef.current = canvas;
        }

        const player = new VFXPlayer(canvasRef.current, props.pixelRatio);
        setPlayer(player);

        player.play();

        return () => {
            player.stop();
            player.destroy();
            canvasRef.current?.remove();
        };
    }, [canvasRef, props.pixelRatio]);

    return (
        <>
            {/* <canvas ref={canvasRef} style={canvasStyle as any} /> */}
            <VFXContext.Provider value={player}>
                {props.children}
            </VFXContext.Provider>
        </>
    );
};

export default VFXProvider;
