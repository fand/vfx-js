import type { ElementRect } from "../rect.js";
import type { EffectDims } from "../types.js";
import { buildFrag, describeGlslError } from "./glsl.js";
import type {
    ShaderTransitionDef,
    ShaderTransitionOpts,
    TransitionEffect,
    TransitionEffectContext,
    TransitionRun,
    TransitionUniforms,
} from "./types.js";

// Shaders that failed per GL context; later runs with them cut at once.
const broken = new WeakMap<WebGL2RenderingContext, Set<string>>();

function brokenIn(gl: WebGL2RenderingContext): Set<string> {
    let set = broken.get(gl);
    if (!set) {
        set = new Set();
        broken.set(gl, set);
    }
    return set;
}

function covers(outer: ElementRect, inner: ElementRect): boolean {
    const [x, y, w, h] = outer;
    const [innerX, innerY, innerW, innerH] = inner;
    return (
        x <= innerX &&
        y <= innerY &&
        x + w >= innerX + innerW &&
        y + h >= innerY + innerH
    );
}

function reportBroken(name: string, err: unknown): void {
    const lines = describeGlslError(err);
    if (lines) {
        console.error(
            `[VFX-JS] transition "${name}" failed to compile; cutting to the new content.\n  ${lines.join("\n  ")}`,
        );
        console.debug(err);
    } else {
        console.error(
            `[VFX-JS] transition "${name}" failed; cutting to the new content.`,
            err,
        );
    }
}

class ShaderTransitionEffect implements TransitionEffect {
    #name: string;
    #frag: string;
    #uniforms: TransitionUniforms;
    #overflow: true | number | undefined;
    #run: TransitionRun | null = null;

    constructor(
        name: string,
        frag: string,
        uniforms: TransitionUniforms,
        overflow: true | number | undefined,
    ) {
        this.#name = name;
        this.#frag = frag;
        this.#uniforms = uniforms;
        this.#overflow = overflow;
    }

    start(run: TransitionRun): void {
        this.#run = run;
    }

    end(): void {
        this.#run = null;
    }

    // A target that fills the canvas never draws outside itself.
    outputRect(dims: EffectDims): ElementRect | undefined {
        const overflow = this.#run?.overflow ?? this.#overflow;
        if (
            overflow === undefined ||
            covers(dims.contentRect, dims.canvasRect)
        ) {
            return undefined;
        }
        if (overflow === true) {
            return dims.canvasRect;
        }
        const pad = overflow * dims.pixelRatio;
        const [x, y, w, h] = dims.contentRect;
        return [x - pad, y - pad, w + pad * 2, h + pad * 2];
    }

    render(ctx: TransitionEffectContext): void {
        // While holding, the input is the snapshot; show it as is.
        if (ctx.holding) {
            ctx.blit(ctx.src);
            return;
        }
        const failed = brokenIn(ctx.gl);
        if (failed.has(this.#frag)) {
            ctx.cut();
            ctx.blit(ctx.src);
            return;
        }
        try {
            ctx.draw({
                frag: this.#frag,
                uniforms: {
                    ...this.#uniforms,
                    ...ctx.run.uniforms,
                    from: ctx.from,
                    src: ctx.src,
                    t: ctx.progress.t,
                    reverse: ctx.reverse ? 1 : 0,
                    resolution: [
                        ctx.dims.elementPixel[0],
                        ctx.dims.elementPixel[1],
                    ],
                    time: ctx.time,
                },
                target: ctx.target,
            });
        } catch (err) {
            failed.add(this.#frag);
            reportBroken(this.#name, err);
            ctx.cut();
            ctx.blit(ctx.src);
        }
    }
}

/**
 * A transition made of one shader.
 * `frag` defines `vec4 transition(vec2 uv, float t)` and reads the two sides with `readFrom` / `readTo`.
 */
export function shaderTransition(
    opts: ShaderTransitionOpts,
): ShaderTransitionDef {
    const uniforms = opts.uniforms ?? {};
    let full: string | null = null;
    return {
        name: opts.name,
        frag: opts.frag,
        uniforms,
        overflow: opts.overflow,
        ease: opts.ease,
        create() {
            full ??= buildFrag(opts.frag);
            return new ShaderTransitionEffect(
                opts.name,
                full,
                uniforms,
                opts.overflow,
            );
        },
    };
}
