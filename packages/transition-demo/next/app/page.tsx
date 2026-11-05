import Link from "next/link";
import { Code } from "./_components/code";
import { HeroStage } from "./_components/hero-stage";
import { LiveStage } from "./_components/live-stage";
import { PageFrame } from "./_components/page-frame";
import { PageTransition } from "./_components/page-transition";

const features = [
    {
        k: "01",
        title: "Ten presets, one import",
        body: "Glitch, JPEG glitch, pixel sort, datamosh, zoom blur and more. Pick one per link, or set a default.",
    },
    {
        k: "02",
        title: "Any router",
        body: "Drop-in React component for Next.js. A small hook for Nuxt, SvelteKit and Astro. Plain run(cb) for everything else.",
    },
    {
        k: "03",
        title: "The DOM stays DOM",
        body: "VFX-JS wraps the element only while a run is in flight. At rest it is your markup: selectable, accessible, crawlable.",
    },
    {
        k: "04",
        title: "Back plays in reverse",
        body: "Browser back is detected for you. Map it to any preset with reverse: true.",
    },
    {
        k: "05",
        title: "Waits for media",
        body: "New images, videos and fonts load before the capture, so you never transition into a blank page.",
    },
    {
        k: "06",
        title: "Your own shader in 5 lines",
        body: "Write vec4 transition(vec2 uv, float t). readFrom and readTo do the rest.",
    },
];

export default function Home() {
    return (
        <PageFrame tone="light">
            <PageTransition preset="zoom" />
            <HeroStage />

            <section className="section split split-live">
                <div className="section-head">
                    <p className="kicker">Live</p>
                    <h2>
                        Every click navigates.
                        <br />
                        <em>Every navigation</em> is a shader.
                    </h2>
                    <p className="lead">
                        This whole site runs on it. Each link in the header uses
                        a different preset.
                    </p>
                </div>
                <LiveStage />
            </section>

            <section className="section">
                <div className="section-head">
                    <p className="kicker">Features</p>
                    <h2>
                        Small API. <em>Loud</em> results.
                    </h2>
                </div>
                <div className="features">
                    {features.map((f) => (
                        <article key={f.k} className="feature">
                            <span className="feature-k">{f.k}</span>
                            <h3>{f.title}</h3>
                            <p>{f.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section split">
                <div className="section-head">
                    <p className="kicker">React in 10 lines</p>
                    <h2>
                        Wrap the outlet.
                        <br />
                        Let the <em>page</em> pick.
                    </h2>
                    <p className="lead">
                        A new pageKey starts a run. The incoming page says how
                        it enters. The old page stays on screen until the shader
                        has its snapshot.
                    </p>
                    <Link href="/how-it-works" className="text-link">
                        How it works →
                    </Link>
                </div>
                <Code label="App.tsx">{`
import { TransitionIn, VFXTransition } from "@vfx-js/react";
import { glitch } from "@vfx-js/transitions";

export function App({ pathname, page }) {
  return (
    <VFXTransition className="outlet" pageKey={pathname}>
      {page}
    </VFXTransition>
  );
}

export function About() {
  return <><TransitionIn transition={glitch} /><h1>About</h1></>;
}
`}</Code>
            </section>
        </PageFrame>
    );
}
