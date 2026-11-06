<script lang="ts">
    import "@vfx-js/transition-demo-shared/style.css";
    import { onNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import { findPage, pages } from "@vfx-js/transition-demo-shared";
    import { presets } from "@vfx-js/transition-demo-shared/transitions";
    import { type RunOpts, type TransitionHandle, VFX } from "@vfx-js/core";
    import { Swipe } from "@vfx-js/transitions";
    import { onMount } from "svelte";

    const back = { transition: Swipe, reverse: true };

    let { children } = $props();
    let outlet: HTMLElement;
    let transition: TransitionHandle | undefined;

    onMount(() => {
        const vfx = new VFX();
        transition = vfx.addTransition(outlet, {
            duration: 0.8,
        });
        return () => vfx.destroy();
    });

    // SvelteKit waits for this promise before it updates the DOM,
    // so `run` gets the old page first.
    onNavigate((nav) => {
        if (!transition || !nav.to || nav.to.url.pathname === nav.from?.url.pathname) {
            return;
        }
        const opts: RunOpts =
            nav.type === "popstate" && (nav.delta ?? 0) < 0
                ? back
                : { transition: presets[findPage(nav.to.url.pathname).transition] };
        const t = transition;
        return new Promise<void>((snapshotTaken) => {
            t.run(async () => {
                snapshotTaken();
                await nav.complete;
            }, opts).catch(() => {});
        });
    });
</script>

<svelte:head>
    <title>{findPage(page.url.pathname).label} | SvelteKit</title>
</svelte:head>

<nav class="nav">
    {#each pages as p (p.path)}
        <a href={p.path} aria-current={p.path === page.url.pathname ? "page" : undefined}>
            {p.label}
        </a>
    {/each}
    <span class="framework">SvelteKit</span>
</nav>
<main class="outlet" bind:this={outlet}>
    {@render children()}
</main>
