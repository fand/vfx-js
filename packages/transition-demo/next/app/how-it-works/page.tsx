import type { Metadata } from "next";
import { Code } from "../_components/code";
import { PageFrame } from "../_components/page-frame";
import { TLink } from "../_components/t-link";

export const metadata: Metadata = { title: "How it works" };

const pipeline = [
    {
        n: "01",
        title: "Snapshot",
        body: "VFX-JS captures the element's current content into a texture. The old page is held on screen.",
        tag: "from",
    },
    {
        n: "02",
        title: "Swap",
        body: "Your callback changes the DOM. A router swap, a setState, innerHTML — anything.",
        tag: "cb()",
    },
    {
        n: "03",
        title: "Capture",
        body: "After images, videos and fonts load, VFX-JS captures the new content.",
        tag: "to",
    },
    {
        n: "04",
        title: "Shade",
        body: "A fragment shader mixes the two textures while t goes from 0 to 1.",
        tag: "t → 1",
    },
];

// Smoothstep curve, sampled for the SVG path.
const curve = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    const y = x * x * (3 - 2 * x);
    return `${i === 0 ? "M" : "L"}${(x * 300).toFixed(1)},${(160 - y * 160).toFixed(1)}`;
}).join(" ");

const limits = [
    "Nested VFX elements in the container freeze during a run and show their plain content.",
    "<body> can't be the target. Target the router outlet, like <main>.",
    "Content of a different size isn't animated between sizes. The box is locked at its old size and jumps afterwards.",
    "One pending click spec per page, shared by all <VFXTransition>s.",
    "Multi-page (cross-document) navigation isn't supported. Turbo and htmx need core run(cb) by hand.",
];

export default function HowItWorks() {
    return (
        <PageFrame tone="paper">
            <section className="doc-hero">
                <p className="kicker">How it works</p>
                <h1>
                    Two textures,
                    <br />
                    <em>one</em> shader.
                </h1>
                <p className="lead">
                    A run looks like <code>document.startViewTransition</code>.
                    The difference: the frames go through WebGL, so the
                    animation can be anything a fragment shader can draw.
                </p>
            </section>

            <section className="doc-section">
                <div className="pipeline">
                    {pipeline.map((p) => (
                        <div key={p.n} className="pipe">
                            <div className="pipe-top">
                                <span className="pipe-n">{p.n}</span>
                                <span className="pipe-tag">{p.tag}</span>
                            </div>
                            <h3>{p.title}</h3>
                            <p>{p.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="doc-section two-col">
                <div>
                    <h2>The DOM stays DOM</h2>
                    <p>
                        At rest the element is your plain markup. VFX-JS wraps
                        it only while a run is in flight, then unwraps it. Text
                        stays selectable, links stay clickable, and screen
                        readers see the real page.
                    </p>
                    <p>
                        With html-in-canvas the capture uses{" "}
                        <code>drawElementImage</code>. Without it, VFX-JS falls
                        back to dom-to-canvas, which is slower.
                    </p>
                </div>
                <figure className="wrap-fig" aria-hidden>
                    <div className="wrap-row">
                        <span className="wrap-label">rest</span>
                        <div className="wrap-box">
                            <code>&lt;main class="outlet"&gt;</code>
                        </div>
                    </div>
                    <div className="wrap-row">
                        <span className="wrap-label">run</span>
                        <div className="wrap-box wrap-box-run">
                            <code>&lt;canvas&gt;</code>
                            <div className="wrap-box">
                                <code>&lt;main class="outlet"&gt;</code>
                            </div>
                        </div>
                    </div>
                    <div className="wrap-row">
                        <span className="wrap-label">rest</span>
                        <div className="wrap-box">
                            <code>&lt;main class="outlet"&gt;</code>
                        </div>
                    </div>
                </figure>
            </section>

            <section className="doc-section two-col">
                <div>
                    <h2>t is eased for you</h2>
                    <p>
                        Your shader gets <code>t</code> from 0 to 1 with a
                        smoothstep ease. Driver hooks also get the linear{" "}
                        <code>x</code> and <code>dt</code> in seconds.
                    </p>
                    <p>
                        With <code>reverse: true</code>, <code>readFrom</code>{" "}
                        and <code>readTo</code> swap and t plays backward. You
                        only write the forward animation.
                    </p>
                </div>
                <figure className="curve-fig" aria-hidden>
                    <svg viewBox="-20 -10 340 200" role="img">
                        <title>Smoothstep ease curve</title>
                        <line x1="0" y1="160" x2="300" y2="160" />
                        <line x1="0" y1="0" x2="0" y2="160" />
                        <path className="curve-diag" d="M0,160 L300,0" />
                        <path className="curve" d={curve} />
                        <text x="300" y="180" textAnchor="end">
                            x (linear)
                        </text>
                        <text x="6" y="8">
                            t
                        </text>
                    </svg>
                </figure>
            </section>

            <section className="doc-section two-col">
                <div>
                    <h2>Fixed size, shared box</h2>
                    <p>
                        Give the target a fixed size: a viewport-sized outlet, a
                        tab panel with a height, a slide stage. Old and new
                        content then share one box, and the shader only mixes
                        pixels.
                    </p>
                    <p>
                        Pages can still scroll <em>inside</em> the box. This
                        site does that: the outlet is fixed and each page
                        scrolls on its own.
                    </p>
                </div>
                <Code label="style.css">{`
.outlet {
  height: calc(100dvh - 64px);
  overflow: hidden;
}
.page {
  height: 100%;
  overflow-y: auto;
}
`}</Code>
            </section>

            <section className="doc-section two-col">
                <div>
                    <h2>Which spec wins</h2>
                    <p>Each run picks its spec in this order:</p>
                    <ol className="order">
                        <li>
                            <code>RunOpts</code> passed to <code>run()</code>,
                            or set by a <code>transition()</code> click
                        </li>
                        <li>
                            <code>types[type]</code>, like{" "}
                            <code>types.back</code> on browser back
                        </li>
                        <li>
                            The options from <code>addTransition</code> or the
                            component props
                        </li>
                    </ol>
                    <p>
                        <code>transition</code> and <code>uniforms</code> travel
                        together, so uniforms never reach the wrong shader.
                    </p>
                </div>
                <Code label="spec.ts">{`
const t = vfx.addTransition(outlet, {
  transition: crossfade,          // default
  types: {
    back: { transition: swipe, reverse: true }, // on back
  },
});

t.run(swap, { type: "back" });
t.run(swap, { transition: glitch }); // wins over both
`}</Code>
            </section>

            <section className="doc-section">
                <h2>Limits</h2>
                <ul className="limits">
                    {limits.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>
            </section>

            <section className="doc-section doc-next">
                <TLink
                    href="/transitions"
                    preset="pixelsort"
                    className="next-card"
                >
                    <span>Next</span>
                    <strong>All transitions →</strong>
                </TLink>
                <TLink href="/custom" preset="glitch" className="next-card">
                    <span>Build</span>
                    <strong>Your own shader →</strong>
                </TLink>
            </section>
        </PageFrame>
    );
}
