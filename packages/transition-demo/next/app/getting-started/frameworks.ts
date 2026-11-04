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
        intro: "Wrap the layout's children in <VFXTransition> and key them by pathname. Put the shell in a client component.",
        snippets: [
            {
                label: "app/shell.tsx",
                code: `
"use client";
import { transition, VFXProvider, VFXTransition } from "@vfx-js/react";
import { glitch, swipe } from "@vfx-js/transitions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FrozenRouter } from "./frozen-router";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <VFXProvider>
      <nav>
        <Link href="/about" onClick={transition({ transition: glitch })}>
          About
        </Link>
      </nav>
      <VFXTransition
        className="outlet"
        duration={0.8}
        types={{ back: { transition: swipe, reverse: true } }}
      >
        <div key={pathname}>
          <FrozenRouter>{children}</FrozenRouter>
        </div>
      </VFXTransition>
    </VFXProvider>
  );
}`,
            },
            {
                label: "app/frozen-router.tsx",
                code: `
"use client";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useRef } from "react";

// Keeps the old page on its own route while it animates out.
export function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}`,
            },
            {
                label: "app/globals.css",
                code: `
/* The transition target needs a fixed size. */
.outlet {
  height: calc(100dvh - 64px);
  overflow: hidden;
}`,
            },
        ],
        notes: [
            "A Server Component can't pass onClick to Link. Wrap the link in a small client component.",
            "loading.tsx shows its fallback as soon as the path changes, so the transition lands on the skeleton.",
        ],
    },
    {
        id: "react",
        name: "React",
        install: "npm i @vfx-js/core @vfx-js/react @vfx-js/transitions",
        intro: "Any router works. A new key on the child starts a run. Here with React Router.",
        snippets: [
            {
                label: "Layout.tsx",
                code: `
import { transition, VFXProvider, VFXTransition } from "@vfx-js/react";
import { crossfade, glitch, swipe } from "@vfx-js/transitions";
import { Link, useLocation, useOutlet } from "react-router";

export function Layout() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  return (
    <VFXProvider>
      <Link to="/about" onClick={transition({ transition: glitch })}>
        About
      </Link>
      <VFXTransition
        className="outlet"
        transition={crossfade}
        types={{ back: { transition: swipe, reverse: true } }}
      >
        <div key={pathname}>{outlet}</div>
      </VFXTransition>
    </VFXProvider>
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
        id: "nuxt",
        name: "Nuxt",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "Use core directly in a client plugin. Hold each navigation in beforeEach until run() has the old page.",
        snippets: [
            {
                label: "plugins/vfx-transition.client.ts",
                code: `
import { type Transition, VFX } from "@vfx-js/core";
import { glitch, swipe } from "@vfx-js/transitions";

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  let t: Transition | undefined;
  let finishSwap: (() => void) | null = null;
  const release = () => { finishSwap?.(); finishSwap = null; };

  nuxtApp.hook("app:mounted", () => {
    const outlet = document.querySelector<HTMLElement>("main.outlet")!;
    t = new VFX().addTransition(outlet, {
      transition: glitch,
      types: { back: { transition: swipe, reverse: true } },
    });
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
            'Detect back with history.state.position and pass { type: "back" } to run().',
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
  import { type Transition, VFX } from "@vfx-js/core";
  import { glitch, swipe } from "@vfx-js/transitions";
  import { onMount } from "svelte";

  let { children } = $props();
  let outlet: HTMLElement;
  let t: Transition | undefined;

  onMount(() => {
    const vfx = new VFX();
    t = vfx.addTransition(outlet, {
      transition: glitch,
      types: { back: { transition: swipe, reverse: true } },
    });
    return () => vfx.destroy();
  });

  onNavigate((nav) => {
    if (!t || !nav.to) return;
    const back = nav.type === "popstate" && (nav.delta ?? 0) < 0;
    return new Promise<void>((snapshotTaken) => {
      t!.run(async () => {
        snapshotTaken();
        await nav.complete;
      }, back ? { type: "back" } : {});
    });
  });
</script>

<main class="outlet" bind:this={outlet}>
  {@render children()}
</main>`,
            },
        ],
        notes: [],
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
import { VFX } from "@vfx-js/core";
import { glitch } from "@vfx-js/transitions";

export function setupTransition() {
  const outlet = document.querySelector<HTMLElement>("main.outlet")!;
  const t = new VFX().addTransition(outlet, { transition: glitch });
  let finishSwap: (() => void) | null = null;

  document.addEventListener("astro:before-preparation", (ev) => {
    const load = ev.loader;
    ev.loader = async () => {
      await load();
      await new Promise<void>((snapshotTaken) => {
        t.run(() => {
          snapshotTaken();
          return new Promise<void>((done) => { finishSwap = done; });
        });
      });
    };
  });

  document.addEventListener("astro:before-swap", (ev) => {
    ev.swap = () => {
      // Swap head as usual, but only replace <main> in the body,
      // so the canvas and the target stay in the document.
      const main = ev.newDocument.querySelector("main.outlet")!;
      outlet.replaceChildren(...main.childNodes);
      finishSwap?.();
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
            "Use swapFunctions from astro:transitions/client for the head, attributes and focus.",
        ],
    },
    {
        id: "vanilla",
        name: "Vanilla",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "run(cb) works like document.startViewTransition(cb): change the DOM in cb, and the shader does the rest.",
        snippets: [
            {
                label: "main.ts",
                code: `
import { VFX } from "@vfx-js/core";
import { swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const t = vfx.addTransition(panel, { transition: swipe, duration: 0.6 });

button.addEventListener("click", () => {
  t.run(() => {
    panel.innerHTML = renderNextTab();
  });
});`,
            },
        ],
        notes: [
            "run() resolves when the animation ends. A new run() drops the old one, but its callback still runs.",
        ],
    },
];
