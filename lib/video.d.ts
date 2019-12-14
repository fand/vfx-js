import * as React from "react";
export interface VFXProps {
    shader?: string;
}
export declare type VFXVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & VFXProps;
declare const VFXVideo: React.FC<VFXVideoProps>;
export default VFXVideo;
