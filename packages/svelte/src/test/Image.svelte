<script lang="ts">
    import { vfx } from "../lib/attachment.svelte.js";
</script>

<img {@attach vfx({ shader: "rgbShift" })} src="cat.png" alt="" />
