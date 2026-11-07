<script lang="ts">
    import type { VFXProps } from "@vfx-js/core";
    import { vfx } from "../lib/attachment.svelte.js";
    import VFXTransition from "../lib/sveltekit/VFXTransition.svelte";
    import VFXCanvas from "../lib/VFXCanvas.svelte";
    import type { VFXConfig } from "../lib/vfx.js";
    import ConfigOwner from "./ConfigOwner.svelte";

    let {
        config,
        showOwner = true,
        elementProps = { shader: "rgbShift" },
        content = "element",
    }: {
        config: VFXConfig;
        showOwner?: boolean;
        elementProps?: VFXProps;
        content?: "element" | "transition" | "canvas" | "none";
    } = $props();
</script>

{#snippet body()}
    {#if content === "element"}
        <h1 {@attach vfx(() => elementProps)}>hi</h1>
    {:else if content === "transition"}
        <VFXTransition>
            <h1 {@attach vfx(() => elementProps)}>hi</h1>
        </VFXTransition>
    {:else if content === "canvas"}
        <VFXCanvas shader="rgbShift">hi</VFXCanvas>
    {/if}
{/snippet}

{#if showOwner}
    <ConfigOwner {config}>{@render body()}</ConfigOwner>
{:else}
    {@render body()}
{/if}
