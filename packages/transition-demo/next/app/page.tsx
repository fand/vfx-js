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
        body: "Drop-in React component for Next.js. A small hook for Nuxt, SvelteKit and Astro. Plain run(cb) for everything else.",
    },
    {
        k: "03",
        title: "Plain DOM at rest",
        body: "VFX-JS wraps the element in a canvas only while a transition plays. The rest of the time it is your markup, so links, text selection and screen readers work as usual.",
    },
    {
        k: "04",
        title: "Waits for new images",
        body: "Before it captures the new content, VFX-JS waits up to about a second for new images, videos and fonts, so the new page does not show up half loaded.",
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
import { glitch } from "@vfx-js/transitions";

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
      <TransitionIn transition={glitch} />
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
import { swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector("#panel");
const t = vfx.addTransition(panel, { transition: swipe });

tab.addEventListener("click", () => {
  t.run(() => {
    panel.innerHTML = renderTab(tab.dataset.id);
  });
});
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
                    <p className="kicker">Usage</p>
                    <h2>
                        Wrap the element that <em>changes</em>.
                    </h2>
                    <p className="lead">
                        In React, put VFXTransition around the router outlet. A
                        new pageKey starts a run, and each page can pick how it
                        enters. Without React, pass the element to addTransition
                        and change its DOM inside run(). Either way, the old
                        content stays on screen until the shader has its
                        snapshot.
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
