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
import { Glitch } from "@vfx-js/transitions";

export default function About() {
  return (
    <>
      <TransitionIn transition={Glitch} />
      <h1>About</h1>
    </>
  );
}`,
            },
        ],
        notes: [
            "The target fills the viewport height and pages scroll inside it. Pass fullscreen={false} to size it with your own CSS, e.g. under a header.",
            "A Server Component can't pass onClick to Link. Wrap the link in a small client component.",
            'Preset classes cross from a Server Component as-is. Pass options as plain params, e.g. <TransitionIn transition={Swipe} params={{ direction: "up" }} />. Make instances with useTransitionInstance in a client component.',
            "loading.tsx shows its fallback as soon as the path changes, so the transition lands on the skeleton.",
        ],
    },
    {
        id: "react",
        name: "React",
        install: "npm i @vfx-js/core @vfx-js/react @vfx-js/transitions",
        intro: "With React Router, use <VFXTransition> from @vfx-js/react/react-router in place of <Outlet />. Each pathname is one page. With another router, use <VFXTransition> from @vfx-js/react and pass a pageKey that changes per page.",
        snippets: [
            {
                label: "Layout.tsx",
                code: `
import { transition } from "@vfx-js/react";
import { VFXTransition } from "@vfx-js/react/react-router";
import { Crossfade, Glitch } from "@vfx-js/transitions";
import { Link } from "react-router";

export function Layout() {
  return (
    <>
      {/* A click spec wins over the page's <TransitionIn>. */}
      <Link to="/about" onClick={transition({ transition: Glitch })}>
        About
      </Link>
      <VFXTransition transition={Crossfade} />
    </>
  );
}`,
            },
            {
                label: "Tabs.tsx",
                code: `
import { useVFXTransition } from "@vfx-js/react";
import { Swipe } from "@vfx-js/transitions";
import { useState } from "react";

const panels = [<p>One</p>, <p>Two</p>, <p>Three</p>];

// For containers you render yourself, like tabs.
export function Tabs() {
  const [tab, setTab] = useState(0);
  const { ref, run } = useVFXTransition({ transition: Swipe });
  const next = () => setTab((tab + 1) % panels.length);
  return (
    <>
      <button onClick={() => run(next)}>Next</button>
      <div ref={ref} style={{ height: 240 }}>{panels[tab]}</div>
    </>
  );
}`,
            },
        ],
        notes: [
            "The old page keeps its own route while it animates out, but useLocation() inside it reads the new location.",
            "Navigate from code with setNextTransition({ transition }) before navigate().",
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
import { Glitch } from "@vfx-js/transitions";

export default function About() {
  return (
    <>
      <TransitionIn transition={Glitch} />
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
        install: "npm i @vfx-js/core @vfx-js/vue @vfx-js/transitions",
        intro: "Put <VFXTransition> from @vfx-js/vue/nuxt around <NuxtPage />. It holds each navigation until the old page is captured. Each page picks its transition with useTransitionIn.",
        snippets: [
            {
                label: "app/app.vue",
                code: `
<script setup lang="ts">
import { Crossfade, Swipe } from "@vfx-js/transitions";
import { vTransition } from "@vfx-js/vue";
import { VFXTransition } from "@vfx-js/vue/nuxt";
</script>

<template>
  <nav>
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/gallery" v-transition="{ transition: Swipe }">
      Gallery
    </NuxtLink>
  </nav>
  <VFXTransition :transition="Crossfade" :duration="0.8">
    <NuxtPage />
  </VFXTransition>
</template>`,
            },
            {
                label: "app/pages/about.vue",
                code: `
<script setup lang="ts">
import { Glitch } from "@vfx-js/transitions";
import { useTransitionIn } from "@vfx-js/vue";

useTransitionIn({ transition: Glitch });
</script>

<template>
  <h1>About</h1>
</template>`,
            },
        ],
        notes: [
            'The target fills the viewport height and pages scroll inside it. Pass :fullscreen="false" to size it with your own CSS, e.g. under a header.',
            "A link's v-transition spec wins over the page's useTransitionIn.",
            "Navigate from code with setNextTransition({ transition }) before navigateTo().",
        ],
    },
    {
        id: "vue",
        name: "Vue",
        install: "npm i @vfx-js/core @vfx-js/vue @vfx-js/transitions",
        intro: "Put <VFXTransition> from @vfx-js/vue/router around <RouterView />. It reads the router from app.use(router) and holds each navigation until the old page is captured. Each page picks its transition with useTransitionIn.",
        snippets: [
            {
                label: "App.vue",
                code: `
<script setup lang="ts">
import { Crossfade, Swipe } from "@vfx-js/transitions";
import { vTransition } from "@vfx-js/vue";
import { VFXTransition } from "@vfx-js/vue/router";
</script>

<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/gallery" v-transition="{ transition: Swipe }">
      Gallery
    </RouterLink>
  </nav>
  <VFXTransition :transition="Crossfade" :duration="0.8">
    <RouterView />
  </VFXTransition>
</template>`,
            },
            {
                label: "pages/About.vue",
                code: `
<script setup lang="ts">
import { Glitch } from "@vfx-js/transitions";
import { useTransitionIn } from "@vfx-js/vue";

useTransitionIn({ transition: Glitch });
</script>

<template>
  <h1>About</h1>
</template>`,
            },
        ],
        notes: [
            'The target fills the viewport height and pages scroll inside it. Pass :fullscreen="false" to size it with your own CSS, e.g. under a header.',
            "A link's v-transition spec wins over the page's useTransitionIn.",
            "A page with an async setup under your own <Suspense> may be captured before it resolves. Use waitFor on <VFXTransition> to wait for it.",
            "Navigate from code with setNextTransition({ transition }) before router.push().",
        ],
    },
    {
        id: "sveltekit",
        name: "SvelteKit",
        install: "npm i @vfx-js/core @vfx-js/svelte @vfx-js/transitions",
        intro: "Put <VFXTransition> from @vfx-js/svelte/sveltekit around the layout's children. It uses onNavigate, so SvelteKit waits for the old page to be captured. Each page picks its transition with transitionIn.",
        snippets: [
            {
                label: "src/routes/+layout.svelte",
                code: `
<script lang="ts">
  import { transition } from "@vfx-js/svelte";
  import { VFXTransition } from "@vfx-js/svelte/sveltekit";
  import { Crossfade, Swipe } from "@vfx-js/transitions";

  let { children } = $props();
</script>

<nav>
  <a href="/">Home</a>
  <a href="/gallery" {@attach transition({ transition: Swipe })}>Gallery</a>
</nav>
<VFXTransition transition={Crossfade} duration={0.8}>
  {@render children()}
</VFXTransition>`,
            },
            {
                label: "src/routes/about/+page.svelte",
                code: `
<script lang="ts">
  import { transitionIn } from "@vfx-js/svelte";
  import { Glitch } from "@vfx-js/transitions";

  transitionIn({ transition: Glitch });
</script>

<h1>About</h1>`,
            },
        ],
        notes: [
            "The target fills the viewport height and pages scroll inside it. Pass fullscreen={false} to size it with your own CSS, e.g. under a header.",
            "A link's transition(spec) wins over the page's transitionIn.",
            "Needs Svelte 5.29 or later for {@attach}. Navigate from code with setNextTransition({ transition }) before goto().",
        ],
    },
    {
        id: "astro",
        name: "Astro",
        install: "npm i @vfx-js/core @vfx-js/astro @vfx-js/transitions",
        intro: "Put <VFXTransition> from @vfx-js/astro around the layout's <slot />. It hooks into <ClientRouter> and holds each navigation until the old page is captured. Each page picks its transition with <TransitionIn>.",
        snippets: [
            {
                label: "src/layouts/Layout.astro",
                code: `
---
import { ClientRouter } from "astro:transitions";
import { VFXTransition } from "@vfx-js/astro";
---

<!-- The shader is the animation, so turn off the view transition. -->
<html lang="en" transition:animate="none">
  <head><ClientRouter /></head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/gallery" data-vfx-transition="swipe">Gallery</a>
    </nav>
    <VFXTransition transition="crossfade" duration={0.8}>
      <slot />
    </VFXTransition>
  </body>
</html>`,
            },
            {
                label: "src/pages/about.astro",
                code: `
---
import { TransitionIn } from "@vfx-js/astro";
import Layout from "../layouts/Layout.astro";
---

<Layout>
  <TransitionIn transition="glitch" />
  <h1>About</h1>
</Layout>`,
            },
        ],
        notes: [
            "The target fills the viewport height and pages scroll inside it. Pass fullscreen={false} to size it with your own CSS, e.g. under a header.",
            "Transitions are names: the class names from @vfx-js/transitions in lowercase. Register your own with registerVFX from @vfx-js/astro/client.",
            "A link's data-vfx-transition wins over the page's <TransitionIn>.",
        ],
    },
    {
        id: "vanilla",
        name: "Vanilla",
        install: "npm i @vfx-js/core @vfx-js/transitions",
        intro: "show(slide) switches between slides already in the DOM. For content built on the fly, run(cb) works like document.startViewTransition(cb): change the DOM in cb, and VFX-JS animates from the old content to the new.",
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
import { Swipe } from "@vfx-js/transitions";

const vfx = new VFX();
const panel = document.querySelector<HTMLElement>("#panel")!;
const tabs = document.querySelectorAll<HTMLElement>("[data-panel]");

const t = vfx.addTransition(panel, { transition: Swipe, duration: 0.6 });
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
