import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../_components/code";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";

export const metadata: Metadata = { title: "API reference" };

type Row = [name: string, body: string];

const containerOpts: Row[] = [
    ["transition: TransitionDef", "The shader. Defaults to crossfade."],
    [
        "uniforms: TransitionUniforms",
        "Uniforms for transition. Numbers and vectors.",
    ],
    ["duration: number", "Seconds. Defaults to 0.6. 0 cuts without animation."],
    [
        "reverse: boolean",
        "Play backwards. readFrom and readTo swap in the shader.",
    ],
    [
        'ease: "smoothstep" | "linear" | (x) => t',
        "How t follows progress. Defaults to the def's ease, then smoothstep.",
    ],
    [
        "overflow: true | number",
        "Room to draw outside the element. true for the whole canvas, a number for CSS px on every side.",
    ],
    [
        "keepWrapped: boolean",
        "Keep the element wrapped between runs. Saves the wrap cost on frequent runs.",
    ],
    [
        'waitFor: "media" | "none" | (el) => Promise<void>',
        'What to wait for before the new capture. "media" waits for images, videos and fonts, up to about 300 ms.',
    ],
];

const handle: Row[] = [
    [
        "show(slide, opts?)",
        "Shows one direct child and hides the others. slide is an element, an index or a selector. remove: true removes the others instead.",
    ],
    [
        "run(cb, opts?)",
        "Snapshots the element, calls cb to change the DOM, and plays the transition. Resolves when the animation ends.",
    ],
    ["cancel()", "Ends the current run and shows the live content."],
    ["destroy()", "Cancels and stops tracking the element."],
    ["running", "True while a run is in flight."],
];

const runOpts: Row[] = [
    [
        "transition, uniforms, duration, reverse, ease, overflow",
        "Same as the container options. A run's value wins.",
    ],
    [
        "uniforms",
        "Merge per key, run over container. A run with its own transition drops the container's uniforms.",
    ],
    [
        "opts as a function",
        "Called once after cb resolves, so the spec can depend on the new content.",
    ],
];

const vfxTransitionProps: Row[] = [
    [
        "pageKey: string | number",
        "Changes per page, e.g. the pathname. A new key starts a run.",
    ],
    [
        "fullscreen: boolean",
        "Defaults to true: the target is 100dvh tall and scrolls inside. false lets your CSS size it.",
    ],
    [
        "className, style",
        "Go on the inner div, which is the transition target.",
    ],
    [
        "...addTransition options",
        "transition, duration, ease, overflow and the rest, as defaults for every run.",
    ],
];

const defFields: Row[] = [
    ["name: string", "A name for logs."],
    [
        "ease?: TransitionEase",
        "The t this transition expects. A spec's ease wins.",
    ],
    [
        "create(): TransitionEffect | TransitionEffect[]",
        "Makes the effects for one container. Runs that keep the def reuse them.",
    ],
];

const shaderOpts: Row[] = [
    ["name: string", "A name for logs."],
    ["frag: string", "GLSL that defines vec4 transition(vec2 uv, float t)."],
    ["uniforms?: TransitionUniforms", "Defaults. The spec's uniforms win."],
    ["ease?: TransitionEase", 'Defaults to "smoothstep".'],
    [
        "overflow?: true | number",
        "Room outside the element. The spec's overflow wins.",
    ],
];

function Table({ rows }: { rows: Row[] }) {
    return (
        <dl className="api-table">
            {rows.map(([k, v]) => (
                <div key={k}>
                    <dt>
                        <code>{k}</code>
                    </dt>
                    <dd>{v}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function Api() {
    return (
        <PageFrame tone="paper" simpleFooter>
            <PageTransition preset="swipe" />
            <section className="doc-title">
                <h1>API Reference</h1>
                <p className="lead">
                    Core works on any element. The React bindings wrap it for
                    routers. Presets live in <code>@vfx-js/transitions</code>.
                </p>
            </section>

            <section id="add-transition" className="doc-section">
                <h2>vfx.addTransition(element, opts?)</h2>
                <p>
                    From <code>@vfx-js/core</code>. Returns a{" "}
                    <code>TransitionHandle</code> at once. It touches no DOM
                    until the first run.
                </p>
                <Code label="core">{`
import { VFX } from "@vfx-js/core";
import { swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const t = vfx.addTransition(el, { transition: swipe, duration: 0.6 });
`}</Code>
                <Table rows={containerOpts} />
            </section>

            <section id="handle" className="doc-section">
                <h2>TransitionHandle</h2>
                <p>
                    A new <code>run</code> during a run drops the old one. Its
                    callback still runs, so no DOM change is lost.
                </p>
                <Table rows={handle} />
            </section>

            <section id="run-opts" className="doc-section">
                <h2>RunOpts</h2>
                <p>
                    Each field comes from the first level that sets it: the run,
                    then the container, then the def (for <code>ease</code>).
                </p>
                <Code label="run">{`
t.run(() => render(next), { transition: glitch, reverse: true });
`}</Code>
                <Table rows={runOpts} />
            </section>

            <section id="vfx-transition" className="doc-section">
                <h2>{"<VFXTransition>"}</h2>
                <p>
                    From <code>@vfx-js/react</code>. Wrap the router outlet
                    once. Next.js users import it from{" "}
                    <code>@vfx-js/react/next</code>, where <code>pageKey</code>{" "}
                    defaults to the pathname.
                </p>
                <Code label="layout.tsx">{`
<VFXTransition pageKey={pathname} transition={crossfade} duration={0.6}>
  {children}
</VFXTransition>
`}</Code>
                <Table rows={vfxTransitionProps} />
            </section>

            <section id="transition-in" className="doc-section">
                <h2>{"<TransitionIn>"} and useTransitionIn</h2>
                <p>
                    The incoming page says how it enters. Only the spec at mount
                    counts. Use the component in Server Components and the hook
                    in client components.
                </p>
                <Code label="page.tsx">{`
<TransitionIn transition={glitch} />
// or, in a client component:
useTransitionIn({ transition: glitch });
`}</Code>
            </section>

            <section id="transition-link" className="doc-section">
                <h2>transition(spec)</h2>
                <p>
                    Returns an <code>onClick</code> that stores the spec for the
                    next run. It wins over the page&apos;s{" "}
                    <code>{"<TransitionIn>"}</code> and expires after about 10
                    s. It ignores modified and non-left clicks.
                </p>
                <Code label="link.tsx">{`
<Link href="/about" onClick={transition({ transition: glitch })}>About</Link>
`}</Code>
            </section>

            <section id="use-vfx-transition" className="doc-section">
                <h2>useVFXTransition(opts?)</h2>
                <p>
                    For containers you render yourself, like tabs.{" "}
                    <code>run</code> wraps <code>cb</code> in{" "}
                    <code>startTransition</code> and starts after React commits.
                </p>
                <Code label="tabs.tsx">{`
const { ref, run } = useVFXTransition({ transition: swipe });

<div ref={ref}>{tab}</div>

await run(() => setTab(next), { reverse: true });
`}</Code>
            </section>

            <section id="set-next-transition" className="doc-section">
                <h2>setNextTransition(spec)</h2>
                <p>
                    For navigation from code. Like a click spec, it wins over
                    the page.
                </p>
                <Code label="navigate.ts">{`
setNextTransition({ transition: zoom });
router.push("/next");
`}</Code>
            </section>

            <section id="transition-def" className="doc-section">
                <h2>TransitionDef</h2>
                <p>
                    What every preset is. Most are one shader, made with{" "}
                    <code>shaderTransition</code>. See{" "}
                    <Link href="/custom" className="text-link">
                        Custom
                    </Link>{" "}
                    for effects.
                </p>
                <Table rows={defFields} />
            </section>

            <section id="shader-transition" className="doc-section">
                <h2>shaderTransition(opts)</h2>
                <p>
                    From <code>@vfx-js/core</code>. Wraps your <code>frag</code>{" "}
                    with a prelude and a <code>main</code>.
                </p>
                <Table rows={shaderOpts} />
            </section>

            <section className="doc-section doc-next">
                <Link href="/presets" className="next-card">
                    <span>Pick</span>
                    <strong>A preset →</strong>
                </Link>
                <Link href="/playground" className="next-card">
                    <span>Try</span>
                    <strong>Playground →</strong>
                </Link>
            </section>
        </PageFrame>
    );
}
