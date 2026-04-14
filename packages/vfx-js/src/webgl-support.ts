/**
 * Check whether WebGL is available in the current environment.
 *
 * Creates a temporary canvas and attempts to obtain a WebGL2 (or WebGL1)
 * rendering context.  The canvas is discarded immediately after the probe.
 *
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
