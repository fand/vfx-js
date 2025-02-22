import { VFX, type VFXOpts } from "@vfx-js/core";

export function initVFX(opts?: VFXOpts): VFX {
    const vfx = new VFX(opts);

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (window as any).vfx = vfx;

    return vfx;
}
