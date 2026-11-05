import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../_components/code";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";
import { ShaderLab } from "./shader-lab";

export const metadata: Metadata = { title: "Custom transitions" };

const prelude = [
    ["readFrom(p)", "The content you leave. Transparent black outside [0, 1]."],
    ["readTo(p)", "The content you enter."],
    ["inRange(p)", "Whether p is inside [0, 1]."],
    ["t", "Progress, 0 → 1, smoothstep eased."],
    ["resolution", "Element size in physical px."],
    ["time", "Seconds since VFX-JS started."],
    ["reverse", "1.0 when playing in reverse. You rarely need it."],
];

const hooks = [
    [
        "effects()",
        "Creates extra effects the first time a run uses the def. They sit after the transition and pass through until prepare.",
    ],
    [
        "prepare(run, fx)",
        "Runs while the old content is held, before your callback.",
    ],
    [
        "onFrame(t, x, dt, fx)",
        "Runs every frame. t is eased, x is linear, dt is seconds.",
    ],
    [
        "onEnd(fx)",
        "Runs once when the run ends, is dropped or is cancelled. Leave the effects passing through.",
    ],
];

export default function Custom() {
    return (
        <PageFrame tone="paper">
            <PageTransition preset="glitch" />
            <section className="doc-hero">
                <p className="kicker">Custom transitions</p>
                <h1>
                    Write <em>one</em> function.
                </h1>
                <p className="lead">
                    A transition is a fragment of GLSL that defines{" "}
                    <code>vec4 transition(vec2 uv, float t)</code>. VFX-JS adds
                    the prelude, the textures and <code>main</code>.
                </p>
            </section>

            <section className="doc-section">
                <ShaderLab />
            </section>

            <section id="def" className="doc-section two-col">
                <div>
                    <h2>A TransitionDef</h2>
                    <p>
                        Give it a <code>name</code> and the <code>frag</code>.
                        Declare your own uniforms and pass values with each run.
                        Use it anywhere a preset goes.
                    </p>
                    <p>
                        <code>readFrom</code> and <code>readTo</code> swap when{" "}
                        <code>reverse</code> is true, so write only the forward
                        animation.
                    </p>
                </div>
                <Code label="wipe.ts">{`
import type { TransitionDef } from "@vfx-js/core";

export const wipe: TransitionDef = {
  name: "wipe",
  frag: \`
uniform float softness;
vec4 transition(vec2 uv, float t) {
  float m = smoothstep(t - softness, t + softness, uv.x);
  return mix(readTo(uv), readFrom(uv), m);
}
\`,
};

t.run(swap, { transition: wipe, uniforms: { softness: 0.05 } });
`}</Code>
            </section>

            <section id="prelude" className="doc-section">
                <h2>What the prelude gives you</h2>
                <dl className="api-table">
                    {prelude.map(([k, v]) => (
                        <div key={k}>
                            <dt>
                                <code>{k}</code>
                            </dt>
                            <dd>{v}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section id="overflow" className="doc-section two-col">
                <div>
                    <h2>Draw outside the box</h2>
                    <p>
                        By default a transition draws only inside the element.
                        Set <code>overflow</code> to <code>true</code> for the
                        whole canvas, or a number for CSS px on every side. Then{" "}
                        <code>uv</code> goes below 0 and above 1 outside the
                        element.
                    </p>
                    <p>
                        The run's options win over the def's own value. This
                        site passes <code>overflow: 0</code> on the page outlet,
                        so zooms never cover the header.
                    </p>
                </div>
                <Code label="zoom.ts">{`
export const zoom: TransitionDef = {
  name: "zoom",
  overflow: true,
  frag: \`
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
\`,
};
`}</Code>
            </section>

            <section id="hooks" className="doc-section">
                <h2>Driver hooks</h2>
                <p className="lead">
                    Some looks need more than one pass: a datamosh, a pixel
                    sort. Driver hooks chain extra effects after the transition
                    and drive them from JS.
                </p>
                <dl className="api-table">
                    {hooks.map(([k, v]) => (
                        <div key={k}>
                            <dt>
                                <code>{k}</code>
                            </dt>
                            <dd>{v}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section id="state" className="doc-section two-col">
                <div>
                    <h2>Keep state per effect</h2>
                    <p>
                        Two containers may share one def, and the element is
                        unwrapped between runs. Key per-run state by the effect
                        object, not module variables.
                    </p>
                    <p>
                        The effects follow the{" "}
                        <a
                            href="https://github.com/fand/vfx-js/blob/main/docs/EFFECT.md"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Effect API
                        </a>
                        .
                    </p>
                </div>
                <Code label="pixelsort.ts">{`
const reversed = new WeakMap<Effect, boolean>();

export const pixelsort: TransitionDef = {
  name: "pixelsort",
  frag: \`
vec4 transition(vec2 uv, float t) {
  return t < 0.5 ? readFrom(uv) : readTo(uv);
}
\`,
  async effects() {
    const fx = new PixelSortEffect({ range: [1, 1] });
    fx.enabled = false;
    return [fx];
  },
  prepare(run, [fx]) {
    reversed.set(fx, run.reverse);
    fx.enabled = true;
  },
  onFrame(t, _x, _dt, [fx]) {
    // Fully sorted at the halfway swap.
    fx.params.range[0] = Math.abs(1 - 2 * t);
  },
  onEnd([fx]) {
    reversed.delete(fx);
    fx.enabled = false;
  },
};
`}</Code>
            </section>

            <section className="doc-section doc-next">
                <Link href="/transitions" className="next-card">
                    <span>Compare</span>
                    <strong>All presets →</strong>
                </Link>
                <a
                    className="next-card"
                    href="https://github.com/fand/vfx-js/blob/main/docs/TRANSITION.md"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span>Reference</span>
                    <strong>Full API docs ↗</strong>
                </a>
            </section>
        </PageFrame>
    );
}
