<script lang="ts">
    import "@vfx-js/testbed-shared/style.css";
    import { page } from "$app/state";
    import { findPage, pages } from "@vfx-js/testbed-shared";
    import { presets } from "@vfx-js/testbed-shared/transitions";
    import { transition } from "@vfx-js/svelte";
    import { VFXTransition } from "@vfx-js/svelte/sveltekit";
    import { Swipe } from "@vfx-js/transitions";

    let { children } = $props();
</script>

<svelte:head>
    <title>{findPage(page.url.pathname).label} | SvelteKit</title>
</svelte:head>

<nav class="nav">
    {#each pages as p (p.path)}
        <a
            href={p.path}
            aria-current={p.path === page.url.pathname ? "page" : undefined}
            {@attach transition({ transition: presets[p.transition] })}
        >
            {p.label}
        </a>
    {/each}
    <span class="framework">SvelteKit</span>
</nav>
<!-- Back plays the default, Swipe, reversed. -->
<VFXTransition class="outlet" fullscreen={false} transition={Swipe} duration={0.8}>
    {@render children()}
</VFXTransition>
