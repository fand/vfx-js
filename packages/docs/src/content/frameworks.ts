export type Snippet = {
    label: string;
    lang: "tsx" | "vue" | "svelte" | "astro";
    code: string;
};

export type Framework = {
    id: string;
    name: string;
    install: string;
    snippet: Snippet;
    notes: string[];
};

export const frameworks: Framework[] = [
    {
        id: "react",
        name: "React",
        install: "npm i @vfx-js/core @vfx-js/react",
        snippet: {
            label: "App.tsx",
            lang: "tsx",
            code: `
import { VFXImg, VFXSpan, VFXVideo } from "@vfx-js/react";

export function App() {
    return (
        <>
            <VFXImg src="cat.png" alt="" shader="rgbShift" />
            <VFXVideo src="clip.mp4" autoPlay muted loop playsInline shader="halftone" />
            <VFXSpan shader="rainbow">Hello</VFXSpan>
        </>
    );
}`,
        },
        notes: [
            "Every vfx.add option is a prop: shader, effect, uniforms, overflow, ...",
            "No provider needed. All components share one canvas.",
            "Works with Next.js App Router and React Router.",
        ],
    },
    {
        id: "vue",
        name: "Vue",
        install: "npm i @vfx-js/core @vfx-js/vue",
        snippet: {
            label: "App.vue",
            lang: "vue",
            code: `
<script setup lang="ts">
import { vVfx } from "@vfx-js/vue";
</script>

<template>
    <img v-vfx="{ shader: 'rgbShift' }" src="cat.png" alt="" />
    <h1 v-vfx="{ shader: 'glitch', overflow: 30 }">Hello</h1>
</template>`,
        },
        notes: [
            "The directive value is the same object as vfx.add options. null removes the effect.",
            'Register it for the whole app with app.directive("vfx", vVfx).',
            "Works with SSR (Nuxt). No <ClientOnly> needed.",
        ],
    },
    {
        id: "svelte",
        name: "Svelte",
        install: "npm i @vfx-js/core @vfx-js/svelte",
        snippet: {
            label: "App.svelte",
            lang: "svelte",
            code: `
<script lang="ts">
    import { vfx } from "@vfx-js/svelte";
    let shader = $state("rgbShift");
</script>

<img {@attach vfx({ shader: "rgbShift" })} src="cat.png" alt="" />
<h1 {@attach vfx(() => ({ shader }))}>Hello</h1>`,
        },
        notes: [
            "Needs Svelte 5.29 or later.",
            "Pass a getter for options that change.",
            "Works with SvelteKit.",
        ],
    },
    {
        id: "astro",
        name: "Astro",
        install: "npm i @vfx-js/core @vfx-js/astro",
        snippet: {
            label: "index.astro",
            lang: "astro",
            code: `
---
import { VFXImg, VFXSpan } from "@vfx-js/astro";
---

<VFXImg src="/cat.png" alt="" shader="rgbShift" />
<VFXSpan shader="glitch" overflow={30}>Hello</VFXSpan>`,
        },
        notes: [
            "Needs Astro 5 or later. No framework island.",
            "Props must fit in HTML: preset names, GLSL strings, plain numbers.",
            "Register functions and multipass shaders with registerVFX from @vfx-js/astro/client.",
        ],
    },
];
