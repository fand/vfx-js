export = GIF;
declare function GIF(arrayBuffer: any): void;
declare class GIF {
    constructor(arrayBuffer: any);
    raw: {};
    decompressFrame(index: any, buildPatch: any): {
        pixels: any[];
        dims: {
            top: any;
            left: any;
            width: any;
            height: any;
        };
    } | null;
    decompressFrames(buildPatch: any, startFrame: any, endFrame: any): ({
        pixels: any[];
        dims: {
            top: any;
            left: any;
            width: any;
            height: any;
        };
    } | null)[];
}
