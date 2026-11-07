<script lang="ts">
    import { onMount } from "svelte";
    import { vfx } from "../lib/attachment.svelte.js";
    import { vfxInstance } from "../lib/instance.svelte.js";
    import type { VFXConfig } from "../lib/vfx.js";
    import ConfigOwner from "./ConfigOwner.svelte";

    let {
        config,
        showElement = false,
        onRead,
    }: {
        config: VFXConfig;
        showElement?: boolean;
        onRead: (read: () => unknown) => void;
    } = $props();

    const instance = vfxInstance();
    onMount(() => onRead(() => instance.current));
</script>

<ConfigOwner {config}>
    {#if showElement}
        <h1 {@attach vfx({ shader: "rgbShift" })}>hi</h1>
    {/if}
</ConfigOwner>
