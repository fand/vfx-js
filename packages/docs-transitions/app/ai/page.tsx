import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../_components/code";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";

export const metadata: Metadata = { title: "Use with AI" };

const llms = "https://amagi.dev/vfx-js/llms.txt";
const llmsFull = "https://amagi.dev/vfx-js/llms-full.txt";

const prompts = [
    {
        label: "Next.js",
        text: `Add page transitions to this Next.js App Router app with @vfx-js/react and @vfx-js/transitions.
Use Crossfade by default. The About page enters with Glitch.
The Gallery link uses Swipe.`,
    },
    {
        label: "Nuxt",
        text: `Add page transitions to this Nuxt app with <VFXTransition> from @vfx-js/vue/nuxt.
Use Crossfade by default, and Glitch for the About page with useTransitionIn.
Keep the header outside the transition and size the target under it.`,
    },
    {
        label: "Tabs",
        text: `Switch the tabs in #pricing with a Swipe transition from @vfx-js/transitions.
Keep all panels in the DOM and use show(). Swipe right when the new tab is to the left.`,
    },
    {
        label: "Other routers",
        text: `Wire VFX-JS transitions to Turbo Drive with core run(cb).
Hold the navigation until the snapshot is taken. Target the <main> outlet.`,
    },
];

const checks = [
    [
        "Console errors",
        "A transition that fails to compile logs the error with line numbers in your frag, then cuts to the new content. Paste that log back to the agent.",
    ],
    [
        "Screenshots",
        "Agents can't see the canvas. Ask for a Playwright script that clicks a link and screenshots mid-run. The browser needs WebGL.",
    ],
    [
        "Fixed size",
        "If the page jumps after a run, the target's height changed. Ask the agent to fix the height of the target.",
    ],
    [
        "Reduced motion",
        "Ask for duration: 0 when prefers-reduced-motion matches.",
    ],
];

export default function UseWithAI() {
    return (
        <PageFrame tone="paper" simpleFooter>
            <PageTransition preset="pixelScan" />
            <section className="doc-title">
                <h1>Use with AI</h1>
                <p className="lead">
                    The transition API is new, so coding agents don't know it
                    yet. Give them the docs, and they can add transitions to
                    your app or write new ones from a description.
                </p>
            </section>

            <section id="skill" className="doc-section two-col">
                <div>
                    <h2>Install the skill</h2>
                    <p>
                        The VFX-JS skill works with Claude Code, Codex, Cursor
                        and other agents that read skills. Run this in your
                        project.
                    </p>
                    <p>
                        It covers the presets, <code>show</code> and{" "}
                        <code>run</code>, React, Vue, Svelte and Astro, custom
                        transitions,
                        and the pitfalls. The agent reads it when a task needs
                        it.
                    </p>
                </div>
                <Code label="terminal">{`
npx skills add fand/vfx-js
`}</Code>
            </section>

            <section id="llms" className="doc-section two-col">
                <div>
                    <h2>Or use llms.txt</h2>
                    <p>
                        No skill support? Point the agent to{" "}
                        <a href={llms} target="_blank" rel="noreferrer">
                            llms.txt
                        </a>
                        , or paste{" "}
                        <a href={llmsFull} target="_blank" rel="noreferrer">
                            llms-full.txt
                        </a>{" "}
                        into the chat. It has the same content as the skill in
                        one file.
                    </p>
                </div>
                <Code label="prompt" plain>{`
Read ${llmsFull} first.
Then add a Glitch page transition to this app.
`}</Code>
            </section>

            <section id="prompts" className="doc-section">
                <h2>Prompts that work</h2>
                <p className="lead">
                    Name the packages, the target element and the preset. Say
                    what should happen on back navigation.
                </p>
                {prompts.map((p) => (
                    <Code key={p.label} label={p.label} plain>
                        {p.text}
                    </Code>
                ))}
            </section>

            <section id="write" className="doc-section two-col">
                <div>
                    <h2>Write a transition with AI</h2>
                    <p>
                        Describe the motion in words. Ask for a{" "}
                        <code>ShaderTransition</code>, and the agent writes the{" "}
                        <code>frag</code>.
                    </p>
                    <p>
                        Then paste the <code>frag</code> into the{" "}
                        <Link href="/playground">Playground</Link> and press
                        Play. Tell the agent what to change, and paste again.
                        The Playground has sliders only for its own examples,
                        so ask for constants instead of new uniforms while you
                        try it.
                    </p>
                </div>
                <div>
                    <Code label="prompt" plain>{`
Write a VFX-JS ShaderTransition called InkBleed.
The new page spreads in like ink on paper, with a dark rim at the edge.
Use constants, not uniforms, so I can try the frag in the Playground.
`}</Code>
                    <Code label="ink-bleed.ts">{`
import { ShaderTransition } from "@vfx-js/core";

export class InkBleed extends ShaderTransition {
  name = "ink-bleed";
  frag = \`
const float EDGE = 0.08;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec4 transition(vec2 uv, float t) {
  vec2 p = uv * vec2(resolution.x / resolution.y, 1.0) * 6.0;
  float n = (noise(p) * 0.5 + noise(p * 2.0) * 0.25 + noise(p * 4.0) * 0.125) / 0.875;
  float front = t * (1.0 + 2.0 * EDGE) - EDGE;
  float m = smoothstep(n - EDGE, n + EDGE, front);
  vec4 c = mix(readFrom(uv), readTo(uv), m);
  // Darkest where the ink is half spread.
  float rim = 1.0 - abs(m * 2.0 - 1.0);
  return vec4(c.rgb * (1.0 - rim * 0.6), c.a);
}
\`;
}
`}</Code>
                </div>
            </section>

            <section id="check" className="doc-section">
                <h2>Check the result</h2>
                <p className="lead">
                    The agent writes the code but can't watch it run. Close
                    the loop for it.
                </p>
                <dl className="api-table">
                    {checks.map(([k, v]) => (
                        <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="doc-section doc-next">
                <Link href="/playground" className="next-card">
                    <span>Try it</span>
                    <strong>Playground →</strong>
                </Link>
                <Link href="/custom" className="next-card">
                    <span>Learn</span>
                    <strong>Custom transitions →</strong>
                </Link>
                <a
                    className="next-card"
                    href={llmsFull}
                    target="_blank"
                    rel="noreferrer"
                >
                    <span>For agents</span>
                    <strong>llms-full.txt ↗</strong>
                </a>
            </section>
        </PageFrame>
    );
}
