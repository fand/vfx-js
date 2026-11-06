import Link from "next/link";
import { CodeTabs } from "./_components/code-tabs";
import { HeroStage } from "./_components/hero-stage";
import { PageFrame } from "./_components/page-frame";
import { PageTransition } from "./_components/page-transition";

const features = [
    {
        k: "01",
        title: "Ready-made presets",
        body: "Glitch, pixel sort, datamosh, zoom blur and more come in @vfx-js/transitions. Set a default on the container, or pick one per link.",
    },
    {
        k: "02",
        title: "Any router",
        body: "Drop-in React component for Next.js and React routers. Plain run(cb) for everything else.",
    },
    {
        k: "03",
        title: "Plain DOM at rest",
        body: "VFX-JS wraps the element in a canvas only while a transition plays. The rest of the time it is your markup, so links, text selection and screen readers work as usual.",
    },
    {
        k: "04",
        title: "Waits for new images",
        body: "Before it captures the new content, VFX-JS waits up to about 300 ms for new images, videos and fonts, so the new page does not show up half loaded.",
    },
    {
        k: "05",
        title: "Write your own in GLSL",
        body: "Write one function, vec4 transition(vec2 uv, float t). Read the old and new content with readFrom(uv) and readTo(uv).",
    },
    {
        k: "06",
        title: "Use gl-transitions",
        body: "Pass an entry of the gl-transitions package to createGLTransition. Shaders that need extra textures are not supported.",
    },
];

const usage = [
    {
        name: "React",
        code: `
import { TransitionIn, VFXTransition } from "@vfx-js/react";
import { Glitch } from "@vfx-js/transitions";

export function App({ pathname, page }) {
  return (
    <VFXTransition className="outlet" pageKey={pathname}>
      {page}
    </VFXTransition>
  );
}

export function About() {
  return (
    <>
      <TransitionIn transition={Glitch} />
      <h1>About</h1>
    </>
  );
}
`,
    },
    {
        name: "Vanilla",
        code: `
import { VFX } from "@vfx-js/core";
import { Swipe } from "@vfx-js/transitions";

// <div id="panel">: one <section> per tab, all but one hidden.
const vfx = new VFX();
const panel = document.querySelector("#panel");
const t = vfx.addTransition(panel, { transition: Swipe, duration: 0.6 });

for (const tab of document.querySelectorAll("[data-panel]")) {
  tab.addEventListener("click", () => t.show(tab.dataset.panel));
}
`,
    },
];

export default function Home() {
    return (
        <PageFrame tone="light">
            <PageTransition preset="zoom" />
            <HeroStage />

            <section className="section split split-usage">
                <div className="section-head">
                    <p className="kicker">Why VFX-JS</p>
                    <h2>
                        Your real pages, through a <em>shader</em>.
                    </h2>
                    <p className="lead">
                        WebGL transitions usually work only on images you draw
                        yourself. VFX-JS captures the live DOM, with its text,
                        layout and CSS, so any page or component can glitch,
                        melt or warp into the next. Keep your markup and your
                        router. Add one component in React, or one call without
                        it. The old content stays on screen until the shader has
                        its snapshot, so nothing flashes.
                    </p>
                    <Link href="/how-it-works" className="text-link">
                        How it works →
                    </Link>
                </div>
                <CodeTabs tabs={usage} />
            </section>

            <section className="section section-features">
                <div className="section-head">
                    <p className="kicker">Features</p>
                    <h2>
                        Fits into the app <em>you already have</em>.
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
        </PageFrame>
    );
}
