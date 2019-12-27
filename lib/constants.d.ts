export declare const DEFAULT_VERTEX_SHADER = "\nprecision mediump float;\nvoid main() {\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}\n";
export declare const shaders: {
    uvGradient: string;
    rainbow: string;
    glitch: string;
    pixelate: string;
    rgbGlitch: string;
    rgbShift: string;
    halftone: string;
    sinewave: string;
    shine: string;
    blink: string;
    warpTransition: string;
    slitScanTransition: string;
    pixelateTransition: string;
};
