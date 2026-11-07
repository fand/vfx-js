<script lang="ts">
    import {
        BloomEffect,
        PixelateEffect,
        ScanlineEffect,
    } from "@vfx-js/effects";
    import { VFXCanvas } from "@vfx-js/svelte";
    import {
        bloomParams,
        CRT_CANVAS_STYLE,
        CRT_CARD_STYLE,
        CRT_EFFECT_IDS,
        CRT_INPUT_STYLE,
        CRT_PANEL_STYLE,
        CRT_TEXT_STYLE,
        CRT_TITLE_STYLE,
    } from "../styles";

    const instances = {
        pixelate: new PixelateEffect({ size: 6 }),
        scanline: new ScanlineEffect({ spacing: 4 }),
        bloom: new BloomEffect({ ...bloomParams(), intensity: 4.0, pad: 200 }),
    };
    let enabled = $state({ pixelate: true, scanline: true, bloom: true });
    const effect = $derived(
        CRT_EFFECT_IDS.filter((id) => enabled[id]).map((id) => instances[id]),
    );
    let text = $state("Type here");
</script>

<div style={CRT_PANEL_STYLE}>
    <div style="margin-bottom:8px; font-weight:600">VFXCanvas: effect chain</div>
    {#each CRT_EFFECT_IDS as id (id)}
        <label style="display:block">
            <input type="checkbox" bind:checked={enabled[id]} />
            {id}
        </label>
    {/each}
</div>

<VFXCanvas {effect} style={CRT_CANVAS_STYLE}>
    <div style={CRT_CARD_STYLE}>
        <h1 style={CRT_TITLE_STYLE}>VFX-JS</h1>
        <p style={CRT_TEXT_STYLE}>
            Live HTML captured into a WebGL texture, then run through an effect
            chain.
        </p>
        <input bind:value={text} style={CRT_INPUT_STYLE} />
        <p style={CRT_TEXT_STYLE}>{text}</p>
    </div>
</VFXCanvas>
