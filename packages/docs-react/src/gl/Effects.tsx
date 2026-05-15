import { useMemo, forwardRef } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import { FXAAEffect } from "postprocessing";

const FXAA = forwardRef(({}, ref) => {
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
