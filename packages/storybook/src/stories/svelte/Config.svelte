<script lang="ts">
    import { vfx, vfxConfig } from "@vfx-js/svelte";
    import Jellyfish from "../../assets/jellyfish.webp";
    import { ROOT_STYLE, SECTION_HEADER_STYLE } from "../styles";

    let pixelRatio = $state(1);
    let zIndex = $state<number | undefined>(undefined);
    vfxConfig(() => ({ pixelRatio, zIndex }));
</script>

<div style={ROOT_STYLE}>
    <div>
        <button
            style="margin-right:8px"
            onclick={() => (pixelRatio = pixelRatio === 1 ? 2 : 1)}
        >
            pixelRatio: {pixelRatio}
        </button>
        <button onclick={() => (zIndex = zIndex === undefined ? -1 : undefined)}>
            zIndex: {zIndex ?? "default"}
        </button>
    </div>

    <section>
        <div style={SECTION_HEADER_STYLE}>img + rgbShift</div>
        <img
            {@attach vfx({ shader: "rgbShift" })}
            src={Jellyfish}
            alt=""
            style="width:320px"
        />
    </section>

    <section>
        <div style={SECTION_HEADER_STYLE}>h1 + glitch</div>
        <h1 {@attach vfx({ shader: "glitch" })} style="font-size:64px; margin:0">
            Config
        </h1>
    </section>
</div>
