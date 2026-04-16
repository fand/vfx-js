/**
 * Check whether WebGL is available in the current environment.
 * @returns `true` when WebGL can be used, `false` otherwise.
 */
export function isWebGLAvailable(): boolean {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        return gl !== null;
    } catch {
        return false;
    }
}
