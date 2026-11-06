import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../_components/code";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";

export const metadata: Metadata = { title: "Custom transitions" };

const prelude = [
    ["readFrom(p)", "The content you leave. Transparent black outside [0, 1]."],
    ["readTo(p)", "The content you enter."],
    [
        "inRange(p)",
        "Whether p is inside [0, 1]. Guard with it when you wrap or shift uv, so a container overflow doesn't draw outside the element.",
    ],
    ["t", "Progress, 0 → 1, smoothstep eased."],
    ["resolution", "Element size in physical px."],
    ["time", "Seconds since VFX-JS started."],
    ["reverse", "1.0 when playing in reverse. You rarely need it."],
];

const hooks = [
    [
        "constructor(params)",
        "Core calls new Class(params) once per container. Later runs with the same class and equal params reuse the instance.",
    ],
    ["init(ctx), dispose()", "When the instance joins and leaves a container."],
    ["start(run)", "Once per run, while the old content is held."],
    [
        "update(ctx)",
        "Every frame while the animation plays. Read ctx.progress: t is eased, x is linear.",
    ],
    [
        "render(ctx)",
        "Every frame of the run. ctx.from is the old content, ctx.src the new one. Pass the input through while ctx.holding.",
    ],
    ["end()", "Once when the run ends, is dropped or is cancelled."],
    ["ctx.cut()", "Ends the run now and shows the new content."],
];

export default function Custom() {
    return (
        <PageFrame tone="paper" simpleFooter>
            <PageTransition preset="glitch" />
            <section className="doc-title">
                <h1>Custom Transitions</h1>
                <p className="lead">
                    A transition is a class. Most are one fragment of GLSL that
                    defines <code>vec4 transition(vec2 uv, float t)</code>.
                    VFX-JS adds the prelude, the textures and <code>main</code>.
                </p>
            </section>

            <section id="def" className="doc-section two-col">
                <div>
                    <h2>ShaderTransition</h2>
                    <p>
                        Extend it and set a <code>name</code> and the{" "}
                        <code>frag</code>. Params come in through the
                        constructor and are typed. Turn them into uniforms in{" "}
                        <code>uniforms()</code>, which runs every frame. Use the
                        class anywhere a preset goes.
                    </p>
                    <p>
                        <code>readFrom</code> and <code>readTo</code> swap when{" "}
                        <code>reverse</code> is true, so write only the forward
                        animation.
                    </p>
                </div>
                <Code label="wipe.ts">{`
import { ShaderTransition } from "@vfx-js/core";

export class Wipe extends ShaderTransition<{ softness?: number }> {
  name = "wipe";
  frag = \`
uniform float softness;
vec4 transition(vec2 uv, float t) {
  float m = smoothstep(t - softness, t + softness, uv.x);
  return mix(readTo(uv), readFrom(uv), m);
}
\`;
  uniforms() {
    return { softness: this.params.softness ?? 0.05 };
  }
}

t.run(swap, { transition: Wipe, params: { softness: 0.1 } });
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
                        The run's options win over the class's own value. This
                        site passes <code>overflow: 0</code> on the page outlet,
                        so zooms never cover the header.
                    </p>
                </div>
                <Code label="zoom.ts">{`
export class Zoom extends ShaderTransition {
  name = "zoom";
  overflow = true as const;
  frag = \`
vec4 transition(vec2 uv, float t) {
  vec2 uv1 = (uv - 0.5) * (1.0 - t) + 0.5;
  vec2 uv2 = (uv - 0.5) / (t * 0.999 + 0.001) + 0.5;
  vec4 to = inRange(uv) ? readTo(fract(uv2)) : vec4(0.0);
  return mix(readFrom(uv1), to, t);
}
\`;
}
`}</Code>
            </section>

            <section id="hooks" className="doc-section">
                <h2>Hooks</h2>
                <p className="lead">
                    A transition is also an effect, so it gets the effect hooks
                    plus a few for the run. Some looks need more than one
                    shader, like a datamosh or a pixel sort. For those, write a
                    class that implements <code>Transition</code> directly.
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
                    <h2>State lives on the instance</h2>
                    <p>
                        Each container gets its own instance of a class, so keep
                        per-run state on <code>this</code>. Call{" "}
                        <code>super.start(run)</code> when you override{" "}
                        <code>start</code> on a <code>ShaderTransition</code>.
                    </p>
                </div>
                <Code label="flash.ts">{`
export class Flash extends ShaderTransition {
  name = "flash";
  frag = \`
uniform vec3 tint;
vec4 transition(vec2 uv, float t) {
  vec4 c = mix(readFrom(uv), readTo(uv), t);
  return c + vec4(tint * sin(t * 3.141593), 0.0) * c.a;
}
\`;
  #tint: [number, number, number] = [1, 1, 1];

  start(run: TransitionRun) {
    super.start(run);
    // A new color on every run.
    this.#tint = [Math.random(), Math.random(), Math.random()];
  }
  uniforms() {
    return { tint: this.#tint };
  }
}
`}</Code>
            </section>

            <section id="effects" className="doc-section two-col">
                <div>
                    <h2>Build on an effect</h2>
                    <p>
                        A class that implements <code>Transition</code> can
                        extend any effect from <code>@vfx-js/effects</code>.
                        They follow the{" "}
                        <a
                            href="https://github.com/fand/vfx-js/blob/main/docs/EFFECT.md"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Effect API
                        </a>
                        . The effect sees the new content as{" "}
                        <code>ctx.src</code> and the old one as{" "}
                        <code>ctx.from</code>.
                    </p>
                </div>
                <Code label="sort-in.ts">{`
import type { Transition, TransitionEffectContext } from "@vfx-js/core";
import { PixelSortEffect } from "@vfx-js/effects";

// The new content sorts out of streaks.
export class SortIn extends PixelSortEffect implements Transition {
  name = "sort-in";
  constructor() {
    super({ range: [1, 1] });
  }
  start() {
    this.params.range[0] = 1;
  }
  update(ctx: TransitionEffectContext) {
    this.params.range[0] = ctx.progress.t;
  }
}
`}</Code>
            </section>

            <section className="doc-section doc-next">
                <Link href="/playground" className="next-card">
                    <span>Try it</span>
                    <strong>Playground →</strong>
                </Link>
                <Link href="/presets" className="next-card">
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
