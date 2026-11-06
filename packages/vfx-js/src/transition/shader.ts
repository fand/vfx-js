import type { ElementRect } from "../rect.js";
import type { EffectDims } from "../types.js";
import { buildFrag, describeGlslError } from "./glsl.js";
import type {
    Transition,
    TransitionEase,
    TransitionEffectContext,
    TransitionRun,
    TransitionUniforms,
} from "./types.js";

// Full shaders by body; instances with the same body share one string.
const built = new Map<string, string>();

function fullFrag(body: string): string {
    let frag = built.get(body);
    if (frag === undefined) {
        frag = buildFrag(body);
        built.set(body, frag);
    }
    return frag;
}

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

/**
 * A transition made of one shader.
 * `frag` defines `vec4 transition(vec2 uv, float t)` and reads the two sides with `readFrom` / `readTo`.
 */
export abstract class ShaderTransition<P extends object = object>
    implements Transition
{
    abstract readonly name: string;
    abstract readonly frag: string;
    ease?: TransitionEase;
    overflow?: true | number;
    params: P;
    #run: TransitionRun | null = null;

    constructor(params: P = {} as P) {
        this.params = params;
    }

    /** Uniforms for this frame. Read `this.params` here. */
    uniforms(_ctx: TransitionEffectContext): TransitionUniforms {
        return {};
    }

    start(run: TransitionRun): void {
        this.#run = run;
    }

    end(): void {
        this.#run = null;
    }

    // A target that fills the canvas never draws outside itself.
    outputRect(dims: EffectDims): ElementRect | undefined {
        const overflow = this.#run?.overflow ?? this.overflow;
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
        const frag = fullFrag(this.frag);
        const failed = brokenIn(ctx.gl);
        if (failed.has(frag)) {
            ctx.cut();
            ctx.blit(ctx.src);
            return;
        }
        try {
            ctx.draw({
                frag,
                uniforms: {
                    ...this.uniforms(ctx),
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
            failed.add(frag);
            reportBroken(this.name, err);
            ctx.cut();
            ctx.blit(ctx.src);
        }
    }
}
