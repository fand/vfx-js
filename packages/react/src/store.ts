import type { VFXPass, VFXPostEffect } from "@vfx-js/core";
import { VFX } from "@vfx-js/core";

export type VFXConfig = {
    pixelRatio?: number;
    zIndex?: number;
    postEffect?: VFXPostEffect | VFXPass[];
    /**
     * Whether to start the render loop automatically (default `true`).
     * Set to `false` to drive rendering manually via the VFX instance
     * exposed through `VFXContext`.
     */
    autoplay?: boolean;
};

const CONFIG_KEYS = ["pixelRatio", "zIndex", "postEffect", "autoplay"] as const;

function configEqual(a: VFXConfig, b: VFXConfig): boolean {
    return CONFIG_KEYS.every((k) => a[k] === b[k]);
}

let instance: VFX | null = null;
let appliedConfig: VFXConfig = {};
let refCount = 0;
let failed = false;
let flushScheduled = false;
const configOwners: { owner: symbol; config: VFXConfig }[] = [];
const listeners = new Set<() => void>();

function notify(): void {
    for (const l of listeners) {
        l();
    }
}

function effectiveConfig(): VFXConfig {
    return configOwners[configOwners.length - 1]?.config ?? {};
}

function destroyInstance(): void {
    if (instance) {
        instance.stop();
        instance.destroy();
        instance = null;
    }
}

function flush(): void {
    flushScheduled = false;
    if (refCount === 0 || failed) {
        return;
    }
    const config = effectiveConfig();
    if (instance && configEqual(config, appliedConfig)) {
        return;
    }
    destroyInstance();
    appliedConfig = config;
    instance = VFX.init({ ...config });
    // WebGL unavailable: elements stay plain DOM.
    failed = instance === null;
    notify();
}

function scheduleFlush(): void {
    if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flush);
    }
}

export function acquire(): void {
    refCount++;
    scheduleFlush();
}

export function release(): void {
    refCount--;
    if (refCount > 0) {
        return;
    }
    // Wait a frame so a remount in the same tick keeps the instance.
    requestAnimationFrame(() => {
        if (refCount > 0) {
            return;
        }
        destroyInstance();
        notify();
    });
}

export function setConfig(owner: symbol, config: VFXConfig): void {
    const entry = configOwners.find((e) => e.owner === owner);
    if (entry) {
        entry.config = config;
    } else {
        const prev = effectiveConfig();
        configOwners.push({ owner, config });
        if (configOwners.length > 1 && !configEqual(prev, config)) {
            warnOnce(
                "multiple",
                "[@vfx-js/react] useVFXConfig is used in more than one mounted component with different options. The last one mounted wins.",
            );
        }
    }
    scheduleFlush();
}

export function clearConfig(owner: symbol): void {
    const i = configOwners.findIndex((e) => e.owner === owner);
    if (i !== -1) {
        configOwners.splice(i, 1);
    }
    scheduleFlush();
}

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getSnapshot(): VFX | null {
    return instance;
}

const warned = new Set<string>();

export function warnOnce(key: string, message: string): void {
    if (!warned.has(key)) {
        warned.add(key);
        console.warn(message);
    }
}
