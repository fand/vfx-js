import type { Meta, StoryObj } from "@storybook/html-vite";

import Jellyfish from "./assets/jellyfish.webp";
import Logo from "./assets/logo-640w-20p.svg";
import { BloomEffect } from "./effects/bloom";
import { CurlParticlesEffect } from "./effects/curl-particles";
import { ExplodeEffect } from "./effects/explode";
import { FluidEffect } from "./effects/fluid";
import { MouseParticlesEffect } from "./effects/mouse-particles";
import { createPixelateEffect } from "./effects/pixelate";
import { ReactionDiffusionEffect } from "./effects/reaction-diffusion";
import { createScanlineEffect } from "./effects/scanline";
import { VoronoiEffect } from "./effects/voronoi";
import "./preset.css";
import {
    attachBloomPane,
    attachFluidPane,
    attachMouseParticlesPane,
    attachParticlesPane,
    attachRDPane,
    initVFX,
} from "./utils";

export default {
    title: "Effect",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

export const bloom: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        img.style.display = "block";
        img.style.margin = "40px auto";
        return img;
    },
    args: undefined,
};
bloom.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const effect = new BloomEffect({
        threshold: 0.2,
        softness: 0.1,
        intensity: 5,
        scatter: 1,
        dither: 0,
        edgeFade: 0,
        pad: 50,
    });
    await vfx.add(img, { effect });
    attachBloomPane("Bloom", effect);
};

export const crtBloom: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
crtBloom.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const bloom = new BloomEffect({
        threshold: 0.01,
        softness: 0.2,
        intensity: 10.0,
        scatter: 1.0,
        dither: 0.0,
        edgeFade: 0.02,
        pad: 200,
    });
    await vfx.add(img, {
        effect: [
            createPixelateEffect({ size: 10 }),
            createScanlineEffect({ spacing: 5 }),
            bloom,
        ],
    });
    attachBloomPane("CRT Bloom", bloom);
};

// Stable Fluid as a single Effect. Drives mouse splats off real pointer
// events; the play() call seeds a circular sweep so the story renders a
// non-empty frame on first capture.
export const fluid: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
fluid.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const effect = new FluidEffect();
    await vfx.add(img, { effect });
    attachFluidPane("Fluid", effect);

    seedFluidMotion(canvasElement);
};

// Gray-Scott reaction-diffusion. autoplay:false + a 120-frame manual
// render warm-up so the captured screenshot already shows an evolved
// pattern (not just the seed blob).
export const reactionDiffusion: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        return img;
    },
    args: undefined,
};
reactionDiffusion.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX({ autoplay: false });
    const effect = new ReactionDiffusionEffect();
    await vfx.add(img, { effect });
    attachRDPane("Reaction-Diffusion", effect);

    for (let i = 0; i < 120; i++) {
        vfx.render();
    }
    vfx.play();
};

// Mouse-driven GPU curl-noise particles. Particles spawn within
// `radius` px of the cursor, advect along curl noise, and leave fading
// trails on a persistent buffer. The play() helper sweeps a synthetic
// pointer in a circle so the captured screenshot already has particles
// before any human interaction.
export const curlParticles: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
curlParticles.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const effect = new CurlParticlesEffect();
    const explode = new ExplodeEffect();
    await vfx.add(img, { effect: [effect, explode] });
    attachParticlesPane("Particles", effect, explode, {
        img,
        sources: { Jellyfish, Logo },
    });

    seedFluidMotion(canvasElement);
};

// Same as `curlParticles`, but the Explode burst sizes its particle
// simulation texture to match the displayed image so there's roughly
// one particle per pixel — gives a clean dissolve where every pixel of
// the source contributes a particle. Capped per-axis to stay within
// reasonable GPU memory limits.
export const curlParticlesExplode: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Logo;
        return img;
    },
    args: undefined,
};
curlParticlesExplode.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });
    // Wait one frame so layout is resolved and clientWidth/Height are
    // populated with the actual rendered pixel size.
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const dpr = window.devicePixelRatio || 1;
    const STATE_MAX = 2048;
    const w = Math.min(
        STATE_MAX,
        Math.max(1, Math.round((img.clientWidth || img.naturalWidth) * dpr)),
    );
    const h = Math.min(
        STATE_MAX,
        Math.max(1, Math.round((img.clientHeight || img.naturalHeight) * dpr)),
    );

    const vfx = initVFX();
    // pointSize=1 — with one particle per displayed pixel, each
    // particle only needs to cover its own pixel. Both effects read
    // pointSize via the proxy installed in attachParticlesPane.
    const effect = new CurlParticlesEffect({ pointSize: 1.0 });
    const explode = new ExplodeEffect({}, [w, h]);
    await vfx.add(img, { effect: [effect, explode] });
    attachParticlesPane("Particles", effect, explode, {
        img,
        sources: { Logo, Jellyfish },
    });

    seedFluidMotion(canvasElement);
};

// Mouse-driven emitter particles. Spawns happen only at the cursor's
// recent position and skip transparent regions of the source image.
export const mouseParticles: StoryObj<undefined> = {
    render: () => {
        const img = document.createElement("img");
        img.src = Jellyfish;
        return img;
    },
    args: undefined,
};
mouseParticles.play = async ({ canvasElement }) => {
    const img = canvasElement.querySelector("img") as HTMLImageElement;
    await new Promise((o) => {
        img.onload = o;
    });

    const vfx = initVFX();
    const effect = new MouseParticlesEffect();
    await vfx.add(img, { effect });
    attachMouseParticlesPane("Mouse Particles", effect, {
        img,
        sources: { Jellyfish, Logo },
    });

    seedFluidMotion(canvasElement);
};

// Voronoi cells shrink in a halo around the mouse — image passes
// through unchanged elsewhere. Follows Presets.stories pattern:
// render() does the full setup every time. Storybook re-runs render()
// on each args change; initVFX() tears down the previous VFX before
// creating a new one, so the swap is clean.
type VoronoiSrc = "Logo" | "Jellyfish" | "Webpage";
type VoronoiArgs = {
    src: VoronoiSrc;
    cellSize: number;
    pressRadius: number;
    press: number;
    flatCells: boolean;
    seed: number;
    speed: number;
    breathe: number;
    breatheSpeed: number;
    breatheScale: number;
    bgColor: string;
};
function createVoronoiWebpage(): HTMLElement {
    const wrap = document.createElement("article");
    wrap.style.cssText =
        "width: 600px; padding: 32px; background: #fff; color: #202122;" +
        " font-family: sans-serif; line-height: 1.6;" +
        " border: 1px solid #a2a9b1;";
    const h2 =
        "font-family: serif; font-weight: normal;" +
        " border-bottom: 1px solid #a2a9b1; padding-bottom: 4px;" +
        " margin-top: 24px;";
    const fig = "margin: 20px 0; text-align: center;";
    const cap = "font-size: 0.85em; color: #54595d; margin-top: 4px;";
    const svg =
        "width: 100%; height: auto; max-width: 480px;" +
        " background: #f8f9fa; border: 1px solid #a2a9b1;";
    const voronoiSvg = `
        <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"
             style="${svg}">
            <polygon points="0,0 110,0 100,55 0,70" fill="#fce5cd" stroke="#54595d"/>
            <polygon points="110,0 240,0 220,75 100,55" fill="#d9ead3" stroke="#54595d"/>
            <polygon points="240,0 400,0 400,80 220,75" fill="#cfe2f3" stroke="#54595d"/>
            <polygon points="0,70 100,55 130,140 0,160" fill="#ead1dc" stroke="#54595d"/>
            <polygon points="100,55 220,75 240,150 130,140" fill="#fff2cc" stroke="#54595d"/>
            <polygon points="220,75 400,80 400,170 240,150" fill="#d0e0e3" stroke="#54595d"/>
            <polygon points="0,160 130,140 145,240 0,240" fill="#f4cccc" stroke="#54595d"/>
            <polygon points="130,140 240,150 250,240 145,240" fill="#d9d2e9" stroke="#54595d"/>
            <polygon points="240,150 400,170 400,240 250,240" fill="#fff2cc" stroke="#54595d"/>
            <circle cx="50" cy="30" r="3" fill="#202122"/>
            <circle cx="170" cy="30" r="3" fill="#202122"/>
            <circle cx="320" cy="35" r="3" fill="#202122"/>
            <circle cx="50" cy="110" r="3" fill="#202122"/>
            <circle cx="170" cy="105" r="3" fill="#202122"/>
            <circle cx="320" cy="120" r="3" fill="#202122"/>
            <circle cx="65" cy="200" r="3" fill="#202122"/>
            <circle cx="190" cy="195" r="3" fill="#202122"/>
            <circle cx="320" cy="205" r="3" fill="#202122"/>
        </svg>
    `;
    const delaunaySvg = `
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"
             style="${svg}">
            <g fill="none" stroke="#54595d" stroke-width="1.2">
                <line x1="60" y1="40" x2="180" y2="60"/>
                <line x1="180" y1="60" x2="320" y2="35"/>
                <line x1="60" y1="40" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="340" y2="140"/>
                <line x1="220" y1="150" x2="340" y2="140"/>
                <line x1="80" y1="140" x2="220" y2="150"/>
            </g>
            <circle cx="60" cy="40" r="4" fill="#cc0000"/>
            <circle cx="180" cy="60" r="4" fill="#cc0000"/>
            <circle cx="320" cy="35" r="4" fill="#cc0000"/>
            <circle cx="80" cy="140" r="4" fill="#cc0000"/>
            <circle cx="220" cy="150" r="4" fill="#cc0000"/>
            <circle cx="340" cy="140" r="4" fill="#cc0000"/>
        </svg>
    `;
    wrap.innerHTML = `
        <h1 style="font-family: serif; font-weight: normal;
                   border-bottom: 1px solid #a2a9b1;
                   padding-bottom: 4px; margin: 0 0 4px;">
            Voronoi diagram
        </h1>
        <div style="font-size: 0.85em; color: #54595d; margin-bottom: 16px;">
            From Wikipedia, the free encyclopedia
        </div>
        <p>
            In mathematics, a <b>Voronoi diagram</b> is a partition of a
            plane into regions close to each of a given set of objects.
            It is named after Georgy Voronoy and is also known as a
            Dirichlet tessellation or Thiessen polygons.
        </p>
        <figure style="${fig}">
            ${voronoiSvg}
            <figcaption style="${cap}">
                Figure 1. A Voronoi diagram with 9 sites in the plane.
            </figcaption>
        </figure>
        <h2 style="${h2}">Definition</h2>
        <p>
            For each seed there is a corresponding region, called a
            <i>Voronoi cell</i>, consisting of all points of the plane
            closer to that seed than to any other. Cell boundaries are
            segments of the perpendicular bisectors between pairs of
            neighbouring sites.
        </p>
        <h2 style="${h2}">History</h2>
        <p>
            Informal use dates back to Descartes (<i>Principia
            Philosophiae</i>, 1644). Lejeune Dirichlet studied the 2D
            and 3D cases in 1850, and Georgy Voronoy generalized the
            construction to higher dimensions in 1908. In meteorology,
            Alfred Thiessen rediscovered the planar version in 1911 to
            estimate rainfall over a region.
        </p>
        <h2 style="${h2}">Properties</h2>
        <ul>
            <li>Each Voronoi cell is a convex polygon (or polytope).</li>
            <li>The number of edges of an unbounded cell equals the
                number of its Voronoi neighbours.</li>
            <li>For sites in general position, each Voronoi vertex is
                the centre of a circle that passes through three sites
                and contains no other site in its interior.</li>
            <li>The diagram has at most <i>2n − 5</i> vertices and
                <i>3n − 6</i> edges for <i>n</i> sites.</li>
        </ul>
        <h2 style="${h2}">Dual: Delaunay triangulation</h2>
        <p>
            The dual graph of a Voronoi diagram is the <b>Delaunay
            triangulation</b>: connect two sites by an edge whenever
            their cells share a boundary segment. The Delaunay
            triangulation maximizes the minimum interior angle of all
            triangles, avoiding sliver triangles.
        </p>
        <figure style="${fig}">
            ${delaunaySvg}
            <figcaption style="${cap}">
                Figure 2. Delaunay triangulation of 6 sites.
            </figcaption>
        </figure>
        <h2 style="${h2}">Algorithms</h2>
        <p>
            Several algorithms construct Voronoi diagrams in
            <i>O(n log n)</i> time, matching the lower bound:
        </p>
        <ul>
            <li><b>Fortune's algorithm</b> (1987) — sweepline approach
                using a parabolic beach line.</li>
            <li><b>Bowyer–Watson algorithm</b> — incremental
                construction of the dual Delaunay triangulation.</li>
            <li><b>Lloyd's relaxation</b> — iterative method that moves
                each site to its cell's centroid, producing centroidal
                Voronoi tessellations.</li>
            <li><b>Divide and conquer</b> — Shamos and Hoey, 1975.</li>
        </ul>
        <h2 style="${h2}">Applications</h2>
        <p>
            Voronoi diagrams have practical and theoretical uses in
            many fields, mainly in science and technology, but also in
            visual art:
        </p>
        <ul>
            <li>Computational geometry — nearest-neighbour search,
                largest empty circle, motion planning.</li>
            <li>Solid-state physics — Wigner–Seitz cells of crystal
                lattices.</li>
            <li>Cellular biology — modelling tissue packing and
                epithelial cell shapes.</li>
            <li>Networking and infrastructure — service-area
                assignment, cellphone tower coverage, school
                catchments.</li>
            <li>Procedural graphics — texture synthesis, terrain
                generation, stylized shading.</li>
            <li>Astronomy — analysing galaxy distribution and the
                cosmic web.</li>
        </ul>
        <h2 style="${h2}">See also</h2>
        <ul>
            <li>Centroidal Voronoi tessellation</li>
            <li>Power diagram (weighted Voronoi)</li>
            <li>Apollonius diagram</li>
            <li>Worley noise</li>
        </ul>
        <h2 style="${h2}">References</h2>
        <ol style="font-size: 0.9em; color: #202122;">
            <li>Voronoy, G. (1908). "Nouvelles applications des
                paramètres continus à la théorie des formes
                quadratiques." <i>J. Reine Angew. Math.</i> 133.</li>
            <li>Aurenhammer, F. (1991). "Voronoi diagrams — a survey of
                a fundamental geometric data structure." <i>ACM
                Computing Surveys</i> 23 (3): 345–405.</li>
            <li>Fortune, S. (1987). "A sweepline algorithm for Voronoi
                diagrams." <i>Algorithmica</i> 2: 153–174.</li>
            <li>Okabe, A.; Boots, B.; Sugihara, K.; Chiu, S. N. (2000).
                <i>Spatial Tessellations: Concepts and Applications of
                Voronoi Diagrams</i> (2nd ed.). Wiley.</li>
        </ol>
    `;
    return wrap;
}
export const voronoi: StoryObj<VoronoiArgs> = {
    render: (args) => {
        const { src, ...effectArgs } = args;
        const vfx = initVFX();
        const effect = new VoronoiEffect(effectArgs);

        if (src === "Webpage") {
            // Webpage is taller than the viewport — switch storybook-root
            // from its default flex-centred layout (preset.css) to block
            // so the article anchors at the top and the page scrolls.
            const root = document.getElementById("storybook-root");
            if (root) {
                root.style.height = "auto";
                root.style.display = "block";
            }

            // wrapElement needs a parentNode at addHTML time so it can
            // splice the canvas wrapper between parent and target.
            const wrapper = document.createElement("div");
            wrapper.style.display = "flex";
            wrapper.style.justifyContent = "center";
            const article = createVoronoiWebpage();
            wrapper.appendChild(article);
            vfx.addHTML(article, { effect });
            return wrapper;
        }

        const img = document.createElement("img");
        img.src = src === "Jellyfish" ? Jellyfish : Logo;
        vfx.add(img, { effect });
        return img;
    },
    args: {
        src: "Webpage",
        cellSize: 40,
        pressRadius: 200,
        press: 1,
        flatCells: false,
        seed: 0,
        speed: 0,
        breathe: 0,
        breatheSpeed: 0,
        breatheScale: 40,
        bgColor: "#00000000",
    },
    argTypes: {
        src: {
            control: { type: "select" },
            options: ["Logo", "Jellyfish", "Webpage"],
        },
        cellSize: { control: { type: "range", min: 5, max: 200, step: 1 } },
        pressRadius: {
            control: { type: "range", min: 0, max: 800, step: 10 },
        },
        press: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
        flatCells: { control: { type: "boolean" } },
        seed: { control: { type: "range", min: 0, max: 1000, step: 1 } },
        speed: { control: { type: "range", min: 0, max: 5, step: 0.05 } },
        breathe: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
        },
        breatheSpeed: {
            control: { type: "range", min: 0, max: 5, step: 0.05 },
        },
        breatheScale: {
            control: { type: "range", min: 10, max: 500, step: 5 },
        },
        bgColor: { control: { type: "color" } },
    },
};

function seedFluidMotion(canvasElement: HTMLElement): void {
    const cx = Math.round(window.innerWidth / 2);
    const cy = Math.round(window.innerHeight / 2);
    const radius = Math.min(cx, cy) * 0.4;
    let i = 0;
    const id = window.setInterval(() => {
        const angle = (i / 60) * Math.PI * 2;
        canvasElement.dispatchEvent(
            new MouseEvent("pointermove", {
                clientX: cx + Math.cos(angle) * radius,
                clientY: cy + Math.sin(angle) * radius,
                bubbles: true,
            }),
        );
        i++;
        if (i > 120) {
            clearInterval(id);
        }
    }, 16);
}
