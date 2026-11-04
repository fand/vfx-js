import { EffectComposer } from "@react-three/postprocessing";
import { FXAAEffect } from "postprocessing";
import { forwardRef, useMemo } from "react";

const FXAA = forwardRef((_props, ref) => {
    const effect = useMemo(() => new FXAAEffect(), []);
    return <primitive ref={ref} object={effect} />;
});

export default function Effects() {
    // Effect doesn't work...
    return null;

    // return (
    //     <EffectComposer multisampling={0}>
    //         <FXAA />
    //     </EffectComposer>
    // );
}
