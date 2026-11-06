export type Snippet = { label: string; code: string };
export type Framework = {
    id: string;
    name: string;
    install: string;
    intro: string;
    snippets: Snippet[];
    notes: string[];
};

export const frameworks: Framework[] = [
    {
        id: "next",
        name: "Next.js",
        install: "npm i @vfx-js/core @vfx-js/react @vfx-js/transitions",
        intro: "Put <VFXTransition> from @vfx-js/react/next around the layout's children. It is a client component, so the layout stays a Server Component. Each page picks its transition with <TransitionIn>.",
        snippets: [
            {
                label: "app/layout.tsx",
                code: `
import { VFXTransition } from "@vfx-js/react/next";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VFXTransition duration={0.8}>{children}</VFXTransition>
      </body>
    </html>
  );
}`,
            },
            {
                label: "app/about/page.tsx",
                code: `
import { TransitionIn } from "@vfx-js/react";
import { glitch } from "@vfx-js/transitions";

export default function About() {
  return (
    <>
      <TransitionIn transition={glitch} />
      <h1>About</h1>
    </>
  );
}`,
            },
        ],
        notes: [
            "The target fills the viewport height and pages scroll inside it. Pass fullscreen={false} to size it with your own CSS, e.g. under a header.",
            "A Server Component can't pass onClick to Link. Wrap the link in a small client component.",
            'Presets cross from a Server Component as-is. Put your own defs and factory calls like createSwipe() in a "use client" file.',
            "loading.tsx shows its fallback as soon as the path changes, so the transition lands on the skeleton.",
        ],
    },
    {
        id: "react",
        name: "React",
        install: "npm i @vfx-js/core @vfx-js/react @vfx-js/transitions",
        intro: "Any router works. A new pageKey starts a run. Here with React Router.",
        snippets: [
            {
                label: "Layout.tsx",
                code: `
import { transition, VFXTransition } from "@vfx-js/react";
import { crossfade, glitch } from "@vfx-js/transitions";
import { Link, useLocation, useOutlet } from "react-router";

export function Layout() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  return (
    <>
      {/* A click spec wins over the page's <TransitionIn>. */}
      <Link to="/about" onClick={transition({ transition: glitch })}>
        About
      </Link>
      <VFXTransition pageKey={pathname} transition={crossfade}>
        {outlet}
      </VFXTransition>
    </>
  );
}`,
            },
            {
                label: "Tabs.tsx",
                code: `
import { useVFXTransition } from "@vfx-js/react";
import { swipe } from "@vfx-js/transitions";
import { useState } from "react";

// For containers you render yourself, like tabs.
export function Tabs() {
  const [tab, setTab] = useState(0);
  const { ref, run } = useVFXTransition({ transition: swipe });
  return (
    <>
      <button onClick={() => run(() => setTab(tab + 1))}>Next</button>
      <div ref={ref} style={{ height: 240 }}>{panels[tab]}</div>
    </>
  );
}`,
            },
        ],
        notes: [
            "Navigate from code with setNextTransition({ transition }) before router.push().",
        ],
    },
    {
        id: "void",
        name: "Void",
        install: "npm i @vfx-js/core @vfx-js/react @vfx-js/transitions",
        intro: "Put <VFXTransition> in the layout with the path as pageKey. Void hands the layout each page as its own element, so the old page keeps rendering until the run swaps it.",
        snippets: [
            {
                label: "pages/layout.tsx",
                code: `
import { VFXTransition } from "@vfx-js/react";
import { Link, useRouter } from "@void/react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { path } = useRouter();
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
      </nav>
      <VFXTransition pageKey={path} duration={0.8}>
        {children}
      </VFXTransition>
    </>
  );
}`,
            },
            {
                label: "pages/about.tsx",
                code: `
import { TransitionIn } from "@vfx-js/react";
import { glitch } from "@vfx-js/transitions";

export default function About() {
  return (
    <>
      <TransitionIn transition={glitch} />
      <h1>About</h1>
    </>
  );
}`,
            },
        ],
        notes: [
            "The target fills the viewport height and pages scroll inside it. Pass fullscreen={false} to size it with your own CSS, e.g. under a header.",
            "This uses the React adapter (@void/react).",
        ],
    },
    {
        id: "vanilla",
        name: "Vanilla",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "show(slide) switches between slides already in the DOM. For content built on the fly, run(cb) works like document.startViewTransition(cb): change the DOM in cb, and the shader does the rest.",
        snippets: [
            {
                label: "index.html",
                code: `
<nav>
  <button data-panel="#home">Home</button>
  <button data-panel="#about">About</button>
  <button data-panel="#contact">Contact</button>
</nav>
<div id="panel">
  <section id="home">...</section>
  <section id="about" hidden>...</section>
  <section id="contact" hidden>...</section>
</div>`,
            },
            {
                label: "main.ts",
                code: `
import { VFX } from "@vfx-js/core";
import { swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const tabs = document.querySelectorAll<HTMLElement>("[data-panel]");

const t = vfx.addTransition(panel, { transition: swipe, duration: 0.6 });
for (const tab of tabs) {
  tab.addEventListener("click", () => t.show(tab.dataset.panel!));
}`,
            },
        ],
        notes: [
            "Give the target a fixed height, like 100dvh. Old and new content then share one box; a size change jumps at the end of the run.",
            "Slides are the direct children of the target. A display rule on a slide beats hidden; add [hidden] { display: none !important }.",
            "show() and run() resolve when the animation ends. A new run drops the old one, but its DOM change still lands.",
        ],
    },
];
