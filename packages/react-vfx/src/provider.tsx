import * as React from "react";
import { useState, useEffect } from "react";
import { VFXContext } from "./context";
import VFXPlayer from "./vfx-player";

const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    "z-index": 9999,
    "pointer-events": "none",
};

export interface VFXProviderProps {
    children?: any; // 😣 https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27805
    pixelRatio?: number;
    zIndex?: number;
}

export const VFXProvider: React.FC<VFXProviderProps> = (props) => {
    const [_player, setPlayer] = useState<VFXPlayer | null>(null);

    useEffect(() => {
        // Create canvas
        const canvas = document.createElement("canvas");
        for (const [k, v] of Object.entries(canvasStyle)) {
            canvas.style.setProperty(k, v.toString());
        }
        if (props.zIndex !== undefined) {
            canvas.style.setProperty("z-index", props.zIndex.toString());
        }
        document.body.appendChild(canvas);

        // Setup player
        const player = new VFXPlayer(canvas, props.pixelRatio);
        setPlayer(player);
        player.play();

        return () => {
            player.stop();
            player.destroy();
            canvas.remove();
        };
    }, [props.pixelRatio, props.zIndex]);

    return (
        <>
            <VFXContext.Provider value={_player}>
                {props.children}
            </VFXContext.Provider>
        </>
    );
};
