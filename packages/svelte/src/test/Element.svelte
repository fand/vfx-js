<script lang="ts">
    import type { VFXProps } from "@vfx-js/core";
    import { vfx } from "../lib/attachment.svelte.js";

    let {
        value,
        text = "hi",
        getter = false,
    }: { value: VFXProps | null; text?: string; getter?: boolean } = $props();
</script>

{#if getter}
    <h1 {@attach vfx(() => value)}>{text}</h1>
{:else}
    <h1 {@attach vfx(value)}>{text}</h1>
{/if}
