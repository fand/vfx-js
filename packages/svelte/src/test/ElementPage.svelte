<script lang="ts">
    import { vfx } from "../lib/attachment.svelte.js";
</script>

<h1 {@attach vfx({ shader: "rgbShift" })}>hi</h1>
