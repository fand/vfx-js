<script lang="ts">
    import {
        BloomEffect,
        PixelateEffect,
        ScanlineEffect,
    } from "@vfx-js/effects";
    import { vfx } from "@vfx-js/svelte";
    import Jellyfish from "../../assets/jellyfish.webp";
    import {
        bloomParams,
        ROOT_STYLE,
        SECTION_HEADER_STYLE,
        SHADERS,
    } from "../styles";

    let shaderIndex = $state(0);
    let enabled = $state(true);
    let pixelateOn = $state(false);
    let count = $state(0);

    // Keep the arrays, so other updates don't touch the chain.
    const scanline = new ScanlineEffect({ spacing: 4 });
    const scanlineOnly = [scanline];
    const scanlinePixelate = [scanline, new PixelateEffect({ size: 8 })];
</script>

<!-- Getters keep each attachment and apply only the diff. -->
<div style={ROOT_STYLE}>
    <section>
        <div style={SECTION_HEADER_STYLE}>shader change: remove + add</div>
        <button onclick={() => (shaderIndex = (shaderIndex + 1) % SHADERS.length)}>
            Shader: {SHADERS[shaderIndex]}
        </button>
        <button onclick={() => (enabled = !enabled)}>
            {enabled ? "Turn off" : "Turn on"}
        </button>
        <h1
            {@attach vfx(() => (enabled ? { shader: SHADERS[shaderIndex] } : null))}
            style="font-size:64px; margin:12px 0 0"
        >
            Live props
        </h1>
    </section>

    <section>
        <div style={SECTION_HEADER_STYLE}>effect change: updateEffects</div>
        <button onclick={() => (pixelateOn = !pixelateOn)}>
            {pixelateOn ? "Remove pixelate" : "Add pixelate"}
        </button>
        <br />
        <img
            {@attach vfx(() => ({
                effect: pixelateOn ? scanlinePixelate : scanlineOnly,
            }))}
            src={Jellyfish}
            alt=""
            style="width:320px; margin-top:12px"
        />
    </section>

    <section>
        <div style={SECTION_HEADER_STYLE}>text change: update</div>
        <button onclick={() => count++}>+1</button>
        <p
            {@attach vfx({ effect: [new BloomEffect(bloomParams())] })}
            style="display:inline-block; font-size:32px; font-weight:700; color:#ffe066; margin:0 0 0 16px"
        >
            Count: {count}
        </p>
    </section>
</div>
