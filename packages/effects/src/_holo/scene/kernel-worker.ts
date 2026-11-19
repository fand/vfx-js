// Ported from holospot engine/scene/kernelWorker.ts (https://github.com/dmitrykurash/holospot), MIT © 2026 Dmitry Kurash.
// A tiny inline-worker runner for self-contained CPU kernels (addendum A6: the logo SDF and the paper maps; the same
// pattern as scene/bumpMaps.ts). The kernel factory's source text (Function.prototype.toString) becomes a Blob worker:
//   const K = (<factory source>)();  self.onmessage = (e) => reply(K[e.data.fn](e.data.arg))
// so the factory must be self-contained (no reference outside its own body; it survives bundling and minification).
// Results are posted back with every ArrayBuffer of the result transferred. Without workers (CSP, old browsers) or after
// a worker error the kernel runs on the page (a one-off stall). No DOM access at module level (node --test safe).

type Factory = () => Record<string, (arg: never) => unknown>;
interface Job {
    resolve(v: unknown): void;
    reject(e: Error): void;
}

/** Every ArrayBuffer reachable through plain objects and arrays of a value (the transfer list of a result). */
export function transferables(
    v: unknown,
    out: Transferable[] = [],
    seen = new Set<unknown>(),
): Transferable[] {
    if (v === null || typeof v !== "object" || seen.has(v)) {
        return out;
    }
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
        if (v.buffer instanceof ArrayBuffer && !out.includes(v.buffer)) {
            out.push(v.buffer);
        }
        return out;
    }
    if (v instanceof ArrayBuffer) {
        if (!out.includes(v)) {
            out.push(v);
        }
        return out;
    }
    for (const x of Array.isArray(v)
        ? v
        : Object.values(v as Record<string, unknown>)) {
        transferables(x, out, seen);
    }
    return out;
}

export class KernelWorker {
    private readonly factory: Factory;
    private worker: Worker | null = null;
    private url = "";
    private failed = false;
    private local: Record<string, (arg: never) => unknown> | null = null;
    private id = 0;
    private readonly jobs = new Map<number, Job>();

    constructor(factory: Factory) {
        this.factory = factory;
    }

    /** Runs `fn(arg)` of the kernel, in the worker where possible. Typed by the caller. */
    async run<R>(
        fn: string,
        arg: unknown,
        transfer: Transferable[] = [],
    ): Promise<R> {
        const w = this.ensure();
        if (w) {
            try {
                return await new Promise<R>((resolve, reject) => {
                    const id = ++this.id;
                    this.jobs.set(id, {
                        resolve: resolve as (v: unknown) => void,
                        reject,
                    });
                    try {
                        w.postMessage({ id, fn, arg }, transfer);
                    } catch (e) {
                        this.jobs.delete(id);
                        reject(new WorkerGone(String(e)));
                        this.fail();
                    }
                });
            } catch (e) {
                if (!(e instanceof WorkerGone)) {
                    throw e; // a kernel error: report it
                }
                // the worker died: fall through to the page
            }
        }
        this.local ??= this.factory();
        const k = this.local;
        const f = k[fn];
        if (typeof f !== "function") {
            throw new Error(`kernel has no function ${fn}`);
        }
        return f(arg as never) as R;
    }

    dispose(): void {
        this.fail();
        this.failed = true;
    }

    private fail(): void {
        this.worker?.terminate();
        this.worker = null;
        if (this.url) {
            URL.revokeObjectURL(this.url);
        }
        this.url = "";
        for (const j of this.jobs.values()) {
            j.reject(new WorkerGone("worker unavailable"));
        }
        this.jobs.clear();
    }

    private ensure(): Worker | null {
        if (this.failed) {
            return null;
        }
        if (this.worker) {
            return this.worker;
        }
        try {
            if (typeof Worker === "undefined" || typeof Blob === "undefined") {
                throw new Error("no workers");
            }
            const src = `"use strict";
const K = (${this.factory.toString()})();
function tr(v, out, seen) {
  if (v === null || typeof v !== "object" || seen.has(v)) return out;
  seen.add(v);
  if (ArrayBuffer.isView(v)) { if (out.indexOf(v.buffer) < 0) out.push(v.buffer); return out; }
  if (v instanceof ArrayBuffer) { if (out.indexOf(v) < 0) out.push(v); return out; }
  for (const x of (Array.isArray(v) ? v : Object.values(v))) tr(x, out, seen);
  return out;
}
self.onmessage = (e) => {
  const d = e.data;
  try {
    const r = K[d.fn](d.arg);
    self.postMessage({ id: d.id, r }, tr(r, [], new Set()));
  } catch (err) {
    self.postMessage({ id: d.id, error: String((err && err.stack) || err) });
  }
};`;
            this.url = URL.createObjectURL(
                new Blob([src], { type: "text/javascript" }),
            );
            const w = new Worker(this.url);
            w.onmessage = (e: MessageEvent) => {
                const d = e.data as { id: number; r?: unknown; error?: string };
                const j = this.jobs.get(d.id);
                if (!j) {
                    return;
                }
                this.jobs.delete(d.id);
                if (d.error !== undefined) {
                    j.reject(new Error(d.error));
                } else {
                    j.resolve(d.r);
                }
            };
            w.onerror = (e: ErrorEvent) => {
                e.preventDefault();
                this.failed = true;
                this.fail();
            };
            this.worker = w;
        } catch {
            this.failed = true;
            this.worker = null;
        }
        return this.worker;
    }
}

class WorkerGone extends Error {}
