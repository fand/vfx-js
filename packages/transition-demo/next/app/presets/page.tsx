import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Code } from "../_components/code";
import { highlight } from "../_components/highlight";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";
import { categories, type PresetInfo, presetList } from "../_lib/presets";
import type { PresetName } from "../_lib/site";
import crossfadeThumb from "./thumbs/crossfade.webp";
import crosszoomThumb from "./thumbs/crosszoom.webp";
import datamoshThumb from "./thumbs/datamosh.webp";
import distortFadeThumb from "./thumbs/distortFade.webp";
import glitchThumb from "./thumbs/glitch.webp";
import glitchSlideThumb from "./thumbs/glitchSlide.webp";
import jpegGlitchThumb from "./thumbs/jpegGlitch.webp";
import lensDistortionThumb from "./thumbs/lensDistortion.webp";
import pixelScanThumb from "./thumbs/pixelScan.webp";
import pixelStretchThumb from "./thumbs/pixelStretch.webp";
import pixelsortThumb from "./thumbs/pixelsort.webp";
import slitScanThumb from "./thumbs/slitScan.webp";
import swipeThumb from "./thumbs/swipe.webp";
import tileThumb from "./thumbs/tile.webp";
import zoomThumb from "./thumbs/zoom.webp";
import zoomBlurThumb from "./thumbs/zoomBlur.webp";

export const metadata: Metadata = { title: "Presets" };

const thumbs: Record<PresetName, StaticImageData> = {
    crossfade: crossfadeThumb,
    swipe: swipeThumb,
    zoom: zoomThumb,
    zoomBlur: zoomBlurThumb,
    crosszoom: crosszoomThumb,
    glitch: glitchThumb,
    glitchSlide: glitchSlideThumb,
    jpegGlitch: jpegGlitchThumb,
    datamosh: datamoshThumb,
    pixelsort: pixelsortThumb,
    lensDistortion: lensDistortionThumb,
    slitScan: slitScanThumb,
    pixelScan: pixelScanThumb,
    pixelStretch: pixelStretchThumb,
    tile: tileThumb,
    distortFade: distortFadeThumb,
};

function importOf(p: PresetInfo): string {
    const names = p.factory ? `${p.name}, ${p.factory}` : p.name;
    return `import { ${names} } from "@vfx-js/transitions";`;
}

function Preset({ preset: p }: { preset: PresetInfo }) {
    return (
        <article id={p.name} className="preset">
            <Image className="preset-thumb" src={thumbs[p.name]} alt="" />
            <div className="preset-body">
                <h3>
                    <code>{p.name}</code>
                </h3>
                <p>
                    {p.note}
                    {p.overflow && (
                        <>
                            {" "}
                            Draws outside the element (
                            <code>overflow: true</code>).
                        </>
                    )}
                </p>
                <pre className="preset-import">
                    <code>{highlight(importOf(p))}</code>
                </pre>
                {p.options && (
                    <table className="preset-table">
                        <thead>
                            <tr>
                                <th>Option</th>
                                <th>Type</th>
                                <th>Default</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {p.options.map((o) => (
                                <tr key={o.name}>
                                    <td>
                                        <code>{o.name}</code>
                                    </td>
                                    <td>
                                        <code>{o.type}</code>
                                    </td>
                                    <td>
                                        <code>{o.default}</code>
                                    </td>
                                    <td>{o.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <Link
                    href={`/playground?preset=${p.name}`}
                    className="text-link"
                >
                    Open in Playground →
                </Link>
            </div>
        </article>
    );
}

export default function Presets() {
    return (
        <PageFrame tone="dark" simpleFooter>
            <PageTransition preset="pixelsort" />
            <section className="doc-title">
                <h1>Presets</h1>
                <p className="lead">
                    Every preset in <code>@vfx-js/transitions</code>, grouped by
                    what it suits. Pass one as <code>transition</code>. Presets
                    with options also have a <code>create*</code> factory.
                </p>
            </section>
            {categories.map((c) => (
                <section key={c.id} id={c.id} className="doc-section">
                    <h2>{c.label}</h2>
                    <p>{c.note}</p>
                    <div className="preset-list">
                        {presetList
                            .filter((p) => p.category === c.id)
                            .map((p) => (
                                <Preset key={p.name} preset={p} />
                            ))}
                    </div>
                </section>
            ))}
            <section id="gl-transitions" className="doc-section two-col">
                <div>
                    <h2>gl-transitions</h2>
                    <p>
                        <code>createGLTransition</code> turns any shader from{" "}
                        <a href="https://gl-transitions.com/">gl-transitions</a>{" "}
                        into a transition. Look one up by its <code>name</code>.
                        Shaders that need extra textures are not supported.
                    </p>
                    <p>
                        Try them all in the{" "}
                        <Link href="/playground" className="text-link">
                            Playground
                        </Link>
                        , under the gl-transitions tab.
                    </p>
                </div>
                <Code label="cube.ts">{`
import { createGLTransition } from "@vfx-js/transitions";
import transitions from "gl-transitions";

const cube = transitions.find((t) => t.name === "Cube")!;
t.run(swap, { transition: createGLTransition(cube, { persp: 0.5 }) });
`}</Code>
            </section>
            <section className="doc-section doc-next">
                <Link href="/api" className="next-card">
                    <span>Next</span>
                    <strong>API reference →</strong>
                </Link>
                <Link href="/custom" className="next-card">
                    <span>Build</span>
                    <strong>Your own shader →</strong>
                </Link>
            </section>
        </PageFrame>
    );
}
