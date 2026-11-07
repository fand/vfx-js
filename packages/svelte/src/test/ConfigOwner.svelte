<script lang="ts">
    import type { Snippet } from "svelte";
    import { vfxConfig } from "../lib/config.svelte.js";
    import type { VFXConfig } from "../lib/vfx.js";

    let { config, children }: { config: VFXConfig; children?: Snippet } =
        $props();

    vfxConfig(() => config);
</script>

{@render children?.()}
