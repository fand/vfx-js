import type { VFX } from "@vfx-js/core";
import { useContext, useEffect, useState, useSyncExternalStore } from "react";
import { VFXContext, VFXProviderMarker } from "./context.js";
import {
    acquire,
    clearConfig,
    getSnapshot,
    release,
    setConfig,
    subscribe,
    type VFXConfig,
    warnOnce,
} from "./store.js";

const getServerSnapshot = (): null => null;
const noopSubscribe = (): (() => void) => () => {};

/**
 * Returns the Provider's VFX inside a Provider, else the implicit one.
 * `acquire: false` reads the instance without keeping it alive.
 */
export function useVFXInstance({
    acquire: shouldAcquire = true,
} = {}): VFX | null {
    const inProvider = useContext(VFXProviderMarker);
    const providerVfx = useContext(VFXContext);
    const implicitVfx = useSyncExternalStore(
        inProvider ? noopSubscribe : subscribe,
        getSnapshot,
        getServerSnapshot,
    );

    useEffect(() => {
        if (inProvider || !shouldAcquire) {
            return;
        }
        acquire();
        return release;
    }, [inProvider, shouldAcquire]);

    return inProvider ? providerVfx : implicitVfx;
}

/**
 * Sets the options of the VFX instance shared by components outside
 * `<VFXProvider>`, while the calling component is mounted.
 * Changing options recreates the instance, so memo `postEffect`.
 */
export function useVFXConfig(opts: VFXConfig): void {
    const inProvider = useContext(VFXProviderMarker);
    const [owner] = useState(() => Symbol());
    const { pixelRatio, zIndex, postEffect, autoplay } = opts;

    // Unregister on unmount only, so option changes keep mount order.
    useEffect(() => () => clearConfig(owner), [owner]);

    useEffect(() => {
        if (inProvider) {
            warnOnce(
                "provider",
                "[@vfx-js/react] useVFXConfig does nothing inside <VFXProvider>. Pass the options to the Provider instead.",
            );
            return;
        }
        setConfig(owner, { pixelRatio, zIndex, postEffect, autoplay });
    }, [owner, inProvider, pixelRatio, zIndex, postEffect, autoplay]);
}
