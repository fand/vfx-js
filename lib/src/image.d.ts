import * as React from "react";
export interface VFXProps {
    shader?: string;
}
export declare type VFXImgProps = React.ImgHTMLAttributes<HTMLImageElement> & VFXProps;
declare const VFXImg: React.FC<VFXImgProps>;
export default VFXImg;
