<script lang="ts">
    import { vfx } from "../lib/attachment.svelte.js";
    import ConfigOwner from "./ConfigOwner.svelte";
</script>

<ConfigOwner config={{ pixelRatio: 1 }} />
<ConfigOwner config={{ pixelRatio: 2 }} />
<ConfigOwner config={{ pixelRatio: 3 }} />
<h1 {@attach vfx({ shader: "x" })}>hi</h1>
