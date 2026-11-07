<script lang="ts">
    import type { Component } from "svelte";
    import VFXTransition from "../lib/sveltekit/VFXTransition.svelte";

    let { page, ...props }: { page: Component } & Record<string, unknown> =
        $props();
</script>

<VFXTransition {...props}>
    {@const Page = page}
    <Page />
</VFXTransition>
