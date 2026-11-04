import type { VFXPass, VFXPostEffect } from "@vfx-js/core";
import { VFX } from "@vfx-js/core";

export type VFXConfig = {
    pixelRatio?: number;
    zIndex?: number;
    postEffect?: VFXPostEffect | VFXPass[];
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
let destroyHandle: number | null = null;
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
    if (refCount === 0) {
        return;
    }
    const config = effectiveConfig();
    const changed = !configEqual(config, appliedConfig);
    if (changed) {
        failed = false;
    }
    if (instance ? !changed : failed) {
        return;
    }
    destroyInstance();
    appliedConfig = config;
    try {
        instance = new VFX({ ...config });
    } catch {
        // WebGL unavailable: elements stay plain DOM.
        failed = true;
    }
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
    if (destroyHandle !== null) {
        cancelAnimationFrame(destroyHandle);
        destroyHandle = null;
    }
    scheduleFlush();
}

export function release(): void {
    refCount--;
    if (refCount > 0) {
        return;
    }
    destroyHandle = requestAnimationFrame(() => {
        destroyHandle = null;
        if (refCount > 0) {
            return;
        }
        destroyInstance();
        appliedConfig = {};
        failed = false;
        notify();
    });
}

export function setConfig(owner: symbol, config: VFXConfig): void {
    const entry = configOwners.find((e) => e.owner === owner);
    if (entry) {
        entry.config = config;
    } else {
        configOwners.push({ owner, config });
        if (configOwners.length > 1) {
            warnOnce(
                "multiple",
                "[@vfx-js/react] useVFXConfig is used in more than one mounted component. The last one mounted wins.",
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
