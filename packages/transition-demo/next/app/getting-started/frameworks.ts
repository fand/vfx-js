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
        id: "nuxt",
        name: "Nuxt",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "Use core directly in a client plugin. Hold each navigation in beforeEach until run() has the old page.",
        snippets: [
            {
                label: "plugins/vfx-transition.client.ts",
                code: `
import { type TransitionHandle, VFX } from "@vfx-js/core";
import { glitch } from "@vfx-js/transitions";

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  let t: TransitionHandle | undefined;
  let finishSwap: (() => void) | null = null;
  const release = () => { finishSwap?.(); finishSwap = null; };

  nuxtApp.hook("app:mounted", () => {
    const outlet = document.querySelector<HTMLElement>("main.outlet")!;
    t = new VFX().addTransition(outlet, { transition: glitch });
  });
  nuxtApp.hook("page:finish", release);

  router.beforeEach((to, from) => {
    if (!t || to.path === from.path) return;
    release();
    return new Promise<void>((snapshotTaken) => {
      t!.run(() => {
        snapshotTaken();
        return new Promise<void>((done) => { finishSwap = done; });
      });
    });
  });
});`,
            },
            {
                label: "app.vue",
                code: `
<template>
  <nav>...</nav>
  <main class="outlet">
    <NuxtPage />
  </main>
</template>`,
            },
        ],
        notes: [
            "Give the target a fixed height, like 100dvh. Old and new content then share one box; a size change jumps at the end of the run.",
            "Detect back with history.state.position and pass a spec like { transition: swipe, reverse: true } to run().",
        ],
    },
    {
        id: "sveltekit",
        name: "SvelteKit",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "SvelteKit waits for the onNavigate promise before it updates the DOM, so run() gets the old page first.",
        snippets: [
            {
                label: "src/routes/+layout.svelte",
                code: `
<script lang="ts">
  import { onNavigate } from "$app/navigation";
  import { type TransitionHandle, VFX } from "@vfx-js/core";
  import { glitch, swipe } from "@vfx-js/transitions";
  import { onMount } from "svelte";

  // A spec in a variable; pass it to run().
  const back = { transition: swipe, reverse: true };

  let { children } = $props();
  let outlet: HTMLElement;
  let t: TransitionHandle | undefined;

  onMount(() => {
    const vfx = new VFX();
    t = vfx.addTransition(outlet, { transition: glitch });
    return () => vfx.destroy();
  });

  onNavigate((nav) => {
    if (!t || !nav.to) return;
    const isBack = nav.type === "popstate" && (nav.delta ?? 0) < 0;
    return new Promise<void>((snapshotTaken) => {
      t!.run(async () => {
        snapshotTaken();
        await nav.complete;
      }, isBack ? back : {});
    });
  });
</script>

<main class="outlet" bind:this={outlet}>
  {@render children()}
</main>`,
            },
        ],
        notes: [
            "Give the target a fixed height, like 100dvh. Old and new content then share one box; a size change jumps at the end of the run.",
        ],
    },
    {
        id: "astro",
        name: "Astro",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "Wire run() to ClientRouter by hand: wait for the snapshot in before-preparation, and release it in your swap.",
        snippets: [
            {
                label: "src/transition.ts",
                code: `
import {
  swapFunctions,
  type TransitionBeforePreparationEvent,
  type TransitionBeforeSwapEvent,
} from "astro:transitions/client";
import { VFX } from "@vfx-js/core";
import { glitch } from "@vfx-js/transitions";

export function setupTransition() {
  const outlet = document.querySelector<HTMLElement>("main.outlet")!;
  const t = new VFX().addTransition(outlet, { transition: glitch });
  let finishSwap: (() => void) | null = null;
  const release = () => { finishSwap?.(); finishSwap = null; };

  document.addEventListener("astro:before-preparation", (e) => {
    const ev = e as TransitionBeforePreparationEvent;
    const load = ev.loader;
    ev.loader = async () => {
      await load();
      // A newer or aborted navigation frees this run.
      release();
      ev.signal.addEventListener("abort", release);
      await new Promise<void>((snapshotTaken) => {
        t.run(() => {
          snapshotTaken();
          return new Promise<void>((done) => { finishSwap = done; });
        });
      });
    };
  });

  document.addEventListener("astro:before-swap", (e) => {
    const ev = e as TransitionBeforeSwapEvent;
    ev.swap = () => {
      const doc = ev.newDocument;
      // Same as Astro's swap, except the body: replace only the outlet,
      // so the canvas and the target stay in the document.
      swapFunctions.deselectScripts(doc);
      swapFunctions.swapRootAttributes(doc);
      swapFunctions.swapHeadElements(doc);
      const restoreFocus = swapFunctions.saveFocus();
      const main = doc.querySelector("main.outlet")!;
      outlet.replaceChildren(...main.childNodes);
      restoreFocus();
      release();
    };
  });
}`,
            },
            {
                label: "src/layouts/Layout.astro",
                code: `
<!-- The shader is the animation, so turn off the view transition. -->
<html lang="en" transition:animate="none">
  <head><ClientRouter /></head>
  <body>
    <main class="outlet"><slot /></main>
    <script>
      import { setupTransition } from "../transition";
      setupTransition();
    </script>
  </body>
</html>`,
            },
        ],
        notes: [
            "Give the target a fixed height, like 100dvh. Old and new content then share one box; a size change jumps at the end of the run.",
            "Only the outlet is swapped. Swap anything else that changes per page, like a nav, the same way.",
            "transition:persist inside the outlet does not work with this swap.",
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
