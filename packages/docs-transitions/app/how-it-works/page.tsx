import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../_components/code";
import { highlight } from "../_components/highlight";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";
import { TLink } from "../_components/t-link";

export const metadata: Metadata = { title: "How it works" };

const steps = [
    {
        title: "Snapshot",
        body: "VFX-JS captures the element's current content into a texture. The old page is held on screen.",
    },
    {
        title: "Swap",
        body: "Your callback changes the DOM. Any change works: a router swap, setState, innerHTML. With slides already in the DOM, show(slide) writes it for you.",
    },
    {
        title: "Capture",
        body: "After images, videos and fonts load, VFX-JS captures the new content.",
    },
    {
        title: "Shade",
        body: "A fragment shader mixes the two textures while t goes from 0 to 1.",
    },
];

const domBefore = `<main class="outlet">
  <PageA />
</main>`;

const domRun = `<canvas layoutsubtree>
  <main class="outlet">
    <PageB />
  </main>
</canvas>`;

const domAfter = `<main class="outlet">
  <PageB />
</main>`;

// Smoothstep curve, sampled for the SVG path.
const curve = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    const y = x * x * (3 - 2 * x);
    return `${i === 0 ? "M" : "L"}${(x * 300).toFixed(1)},${(160 - y * 160).toFixed(1)}`;
}).join(" ");

export default function HowItWorks() {
    return (
        <PageFrame tone="paper" simpleFooter>
            <PageTransition preset="crosszoom" />
            <section className="doc-title">
                <h1>How It Works</h1>
            </section>

            <section className="doc-section">
                <figure className="dom-fig">
                    <div className="dom-step">
                        <span className="dom-label">before</span>
                        <pre>
                            <code>{highlight(domBefore)}</code>
                        </pre>
                    </div>
                    <span className="dom-arrow">run(cb)</span>
                    <div className="dom-step">
                        <span className="dom-label">run</span>
                        <pre>
                            <code>{highlight(domRun)}</code>
                        </pre>
                        <p className="dom-caption">
                            The snapshot of A is <code>readFrom</code>, the live
                            capture of B is <code>readTo</code>. The shader
                            mixes them on the VFX canvas while the real DOM is
                            already B.
                        </p>
                    </div>
                    <span className="dom-arrow">t = 1</span>
                    <div className="dom-step">
                        <span className="dom-label">after</span>
                        <pre>
                            <code>{highlight(domAfter)}</code>
                        </pre>
                    </div>
                </figure>
                <ol className="dom-steps">
                    {steps.map((step) => (
                        <li key={step.title}>
                            <strong>{step.title}.</strong> {step.body}
                        </li>
                    ))}
                </ol>
            </section>

            <section id="dom" className="doc-section doc-prose">
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
            </section>

            <section id="easing" className="doc-section two-col">
                <div>
                    <h2>Easing</h2>
                    <p>
                        Your shader gets <code>t</code> from 0 to 1, eased with
                        smoothstep by default. Set <code>ease</code> to{" "}
                        <code>"linear"</code> or a function{" "}
                        <code>(x) =&gt; t</code> to change it. A spec&apos;s{" "}
                        <code>ease</code> wins over the transition&apos;s own.
                    </p>
                    <p>
                        <code>TransitionEffect</code> hooks get both the eased{" "}
                        <code>ctx.progress.t</code> and the linear{" "}
                        <code>ctx.progress.x</code>, plus{" "}
                        <code>ctx.deltaTime</code> in seconds.
                    </p>
                    <p>
                        With <code>reverse: true</code>, <code>readFrom</code>{" "}
                        and <code>readTo</code> swap and t plays backward. You
                        only write the forward animation.
                    </p>
                </div>
                <figure className="curve-fig" aria-hidden>
                    <svg viewBox="-20 -10 340 200" role="img">
                        <title>Default smoothstep ease curve</title>
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

            <section id="size" className="doc-section two-col">
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
  height: 100dvh;
  overflow: hidden;
}
.page {
  height: 100%;
  overflow-y: auto;
}
`}</Code>
            </section>

            <section id="precedence" className="doc-section two-col">
                <div>
                    <h2>Which spec wins</h2>
                    <p>Each field of a run is picked in this order:</p>
                    <ol className="order">
                        <li>
                            The <code>RunOpts</code> passed to{" "}
                            <code>run()</code>
                        </li>
                        <li>
                            The options from <code>addTransition</code> or the
                            component props
                        </li>
                        <li>
                            For <code>ease</code> and <code>overflow</code>, the
                            transition&apos;s own value, then the default
                        </li>
                    </ol>
                    <p>
                        A run that sets its own <code>transition</code> drops
                        the container&apos;s <code>params</code>, so they never
                        reach the wrong class.
                    </p>
                    <p>
                        With a router <code>&lt;VFXTransition&gt;</code>, the
                        run&apos;s <code>RunOpts</code> is one whole spec: a
                        link spec or <code>setNextTransition()</code> if set,
                        else the incoming page&apos;s{" "}
                        <code>&lt;TransitionIn&gt;</code>. The two are not
                        merged.
                    </p>
                </div>
                <Code label="spec.ts">{`
const t = vfx.addTransition(outlet, { transition: Crossfade });

// Keep a spec in a variable and pass it to run().
const back = { transition: Swipe, reverse: true };

t.run(swap, back);
t.run(swap, { duration: 2 }); // Crossfade, 2 s
`}</Code>
            </section>

            <section id="limitations" className="doc-section doc-prose">
                <div>
                    <h2>Limitations</h2>
                    <h3>Nested VFX elements freeze</h3>
                    <p>
                        VFX elements inside the container stop during a run and
                        show their plain content.
                    </p>
                    <h3>
                        <code>&lt;body&gt;</code> can't be the target
                    </h3>
                    <p>
                        Target the router outlet instead, like{" "}
                        <code>&lt;main&gt;</code>.
                    </p>
                    <h3>Size changes aren't animated</h3>
                    <p>
                        If the new content has a different size, the box stays
                        at the old size during the run and jumps afterwards.
                    </p>
                    <h3>One pending click spec per page</h3>
                    <p>
                        All <code>&lt;VFXTransition&gt;</code>s on the page
                        share it.
                    </p>
                    <h3>No multi-page navigation</h3>
                    <p>
                        Cross-document navigation isn't supported. With Turbo or
                        htmx, call core <code>run(cb)</code> by hand.
                    </p>
                </div>
            </section>

            <section className="doc-section doc-next">
                <Link href="/presets" className="next-card">
                    <span>Next</span>
                    <strong>All presets →</strong>
                </Link>
                {/* A click spec beats the page's own (glitch). */}
                <TLink
                    href="/custom"
                    preset="glitchSlide"
                    className="next-card"
                >
                    <span>Build</span>
                    <strong>Your own shader →</strong>
                </TLink>
            </section>
        </PageFrame>
    );
}
