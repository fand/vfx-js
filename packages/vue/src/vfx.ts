import type { VFXPass, VFXPostEffect } from "@vfx-js/core";
import { VFX } from "@vfx-js/core";

const LOG_PREFIX = "[@vfx-js/vue]";

/** Options of the shared VFX. */
export type VFXConfig = {
    pixelRatio?: number;
    zIndex?: number;
    postEffect?: VFXPostEffect | VFXPass[];
    /** Start the render loop by itself. Default `true`. */
    autoplay?: boolean;
};

const CONFIG_KEYS = ["pixelRatio", "zIndex", "postEffect", "autoplay"] as const;

function configEqual(a: VFXConfig, b: VFXConfig): boolean {
    return CONFIG_KEYS.every((key) => a[key] === b[key]);
}

/** Puts something on the VFX; returns how to take it off. */
type Attach = (vfx: VFX) => () => void | Promise<void>;
type Consumer = { attach: Attach; detach: (() => void | Promise<void>) | null };

// One VFX per page, shared by every component of this package.
let instance: VFX | null = null;
let appliedConfig: VFXConfig = {};
// WebGL unavailable: stay plain DOM, and do not retry.
let failed = false;
let replacing = false;
let flushScheduled = false;
const consumers = new Set<Consumer>();
const configOwners: { owner: symbol; config: VFXConfig }[] = [];

function effectiveConfig(): VFXConfig {
    return configOwners[configOwners.length - 1]?.config ?? {};
}

function create(): void {
    appliedConfig = effectiveConfig();
    instance = VFX.init({ ...appliedConfig });
    failed = instance === null;
}

function destroy(vfx: VFX): void {
    vfx.stop();
    vfx.destroy();
}

function attachOne(consumer: Consumer): void {
    if (instance && !consumer.detach) {
        consumer.detach = consumer.attach(instance);
    }
}

function detachOne(consumer: Consumer): void | Promise<void> {
    const detach = consumer.detach;
    consumer.detach = null;
    return detach?.();
}

// Replace the instance when the config changed.
async function flush(): Promise<void> {
    flushScheduled = false;
    const old = instance;
    if (!old || replacing || configEqual(effectiveConfig(), appliedConfig)) {
        return;
    }
    replacing = true;
    instance = null;
    // Let each consumer leave the old instance before it goes.
    await Promise.all([...consumers].map(detachOne));
    destroy(old);
    replacing = false;
    if (consumers.size > 0) {
        create();
        for (const consumer of consumers) {
            attachOne(consumer);
        }
    }
    // The config may have changed again meanwhile.
    scheduleFlush();
}

function scheduleFlush(): void {
    if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(() => void flush());
    }
}

/**
 * Call `attach` with the shared VFX now and after each replace.
 * Returns the release. Nothing attaches when WebGL is unavailable.
 */
export function attachVFX(attach: Attach): () => void {
    const consumer: Consumer = { attach, detach: null };
    consumers.add(consumer);
    if (!instance && !failed && !replacing) {
        create();
    }
    attachOne(consumer);
    // A kept instance may have an old config.
    scheduleFlush();

    let released = false;
    return () => {
        if (released) {
            return;
        }
        released = true;
        consumers.delete(consumer);
        void Promise.resolve(detachOne(consumer)).finally(() => {
            if (consumers.size > 0) {
                return;
            }
            // Wait a frame so a remount in the same tick keeps the canvas.
            requestAnimationFrame(() => {
                if (consumers.size > 0 || !instance || replacing) {
                    return;
                }
                destroy(instance);
                instance = null;
            });
        });
    };
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
                "config",
                `${LOG_PREFIX} More than one mounted component sets the VFX config, with different options. The last one mounted wins.`,
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

/** The shared VFX if one exists, without taking a reference. */
export function peekVFX(): VFX | null {
    return instance;
}

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
    if (!warned.has(key)) {
        warned.add(key);
        console.warn(message);
    }
}
