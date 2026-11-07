<script lang="ts">
    import {
        BloomEffect,
        PixelateEffect,
        ScanlineEffect,
    } from "@vfx-js/effects";
    import { vfx } from "@vfx-js/svelte";
    import JellyfishMp4 from "../../assets/jellyfish.mp4";
    import Jellyfish from "../../assets/jellyfish.webp";
    import { bloomParams, ROOT_STYLE, SECTION_HEADER_STYLE } from "../styles";
</script>

<div style={ROOT_STYLE}>
    <section>
        <div style={SECTION_HEADER_STYLE}>video + pixelate</div>
        <video
            {@attach vfx({ effect: [new PixelateEffect({ size: 8 })] })}
            src={JellyfishMp4}
            autoplay
            loop
            muted
            playsinline
            style="width:320px"
        ></video>
    </section>

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
        <div style={SECTION_HEADER_STYLE}>span + bloom</div>
        <span
            {@attach vfx({ effect: [new BloomEffect(bloomParams())] })}
            style="display:inline-block; font-size:64px; font-weight:800; color:#ff4fa3"
        >
            Hello, vfx
        </span>
    </section>

    <section>
        <div style={SECTION_HEADER_STYLE}>div + bloom</div>
        <div
            {@attach vfx({ effect: [new BloomEffect(bloomParams())] })}
            style="display:inline-block; padding:24px 32px; background:linear-gradient(135deg, #2d0040, #002040); border-radius:8px; font-size:24px; font-weight:700; color:#ffe066"
        >
            div container
        </div>
    </section>

    <section>
        <div style={SECTION_HEADER_STYLE}>p + scanline</div>
        <p
            {@attach vfx({ effect: [new ScanlineEffect({ spacing: 4 })] })}
            style="max-width:560px; font-size:18px; line-height:1.6; color:#a0e4ff; margin:0"
        >
            The same attachment works on text, images, videos and canvases.
        </p>
    </section>
</div>
