/**
 * Generate agent-facing docs (llms.txt / llms-full.txt / llms/*.md) into dist/.
 * See https://llmstxt.org/ for the llms.txt convention.
 *
 * Runs at the end of the docs build chain, after `vite build` created dist/.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const DIST = path.resolve(__dirname, "../dist");

const SITE = "https://amagi.dev/vfx-js";

/**
 * Ordered manifest of docs published under /llms/.
 * The order defines the concatenation order of llms-full.txt.
 */
const DOCS = [
    {
        slug: "getting-started.md",
        source: "packages/docs/llms/getting-started.md",
        title: "Getting Started",
        description:
            "Install, minimal example, VFX class & VFXProps reference, all shader presets, transitions, custom shader uniforms",
    },
    {
        slug: "core.md",
        source: "packages/vfx-js/README.md",
        title: "@vfx-js/core",
        description: "Core package README: install, usage, updateEffects",
    },
    {
        slug: "effects.md",
        source: "packages/effects/README.md",
        title: "@vfx-js/effects",
        description:
            "Catalogue of ~30 prebuilt effect classes and how to chain them",
    },
    {
        slug: "react.md",
        source: "packages/react/README.md",
        title: "@vfx-js/react",
        description:
            "React bindings: VFXProvider, VFXImg, VFXVideo, VFXSpan, VFXDiv",
    },
    {
        slug: "custom-effects.md",
        source: "docs/EFFECT.md",
        title: "Custom Effect API",
        description:
            "How to author custom Effect classes (lifecycle, dims, draw API)",
    },
    {
        slug: "multipass.md",
        source: "docs/MULTIPASS.md",
        title: "Multipass Shaders",
        description:
            "Chaining shader passes with VFXPass[], named/persistent buffers",
    },
    {
        slug: "post-effects.md",
        source: "docs/POSTEFFECT_EXAMPLE.md",
        title: "Post Effects",
        description: "Full-canvas post-processing via the postEffect option",
    },
    {
        slug: "html-in-canvas.md",
        source: "docs/html-in-canvas.md",
        title: "HTML in Canvas",
        description: "Capturing live HTML content with the html-in-canvas API",
    },
];

/** Assets referenced by the docs above, copied as-is into dist/llms/. */
const ASSETS = [{ slug: "effect-dims.svg", source: "docs/effect-dims.svg" }];

/** Rewrite in-repo relative links to their published /llms/ paths. */
const LINK_REWRITES = [
    ["[EFFECT.md](./EFFECT.md)", "[custom-effects.md](./custom-effects.md)"],
    ["[MULTIPASS.md](./MULTIPASS.md)", "[multipass.md](./multipass.md)"],
    [
        "[POSTEFFECT_EXAMPLE.md](./POSTEFFECT_EXAMPLE.md)",
        "[post-effects.md](./post-effects.md)",
    ],
    ["(./EFFECT.md)", "(./custom-effects.md)"],
    ["(./MULTIPASS.md)", "(./multipass.md)"],
    ["(./POSTEFFECT_EXAMPLE.md)", "(./post-effects.md)"],
];

const HEADER = `# VFX-JS

> VFX-JS is a JavaScript/TypeScript library for adding WebGL-powered visual effects to ordinary HTML elements — images, videos, text, and canvas — with one-line shader presets, custom GLSL shaders, and composable effect classes. Packages: @vfx-js/core, @vfx-js/effects, @vfx-js/react.

Works in any browser with WebGL2. No framework required; React bindings are available.`;

function rewriteLinks(text) {
    let out = text;
    for (const [from, to] of LINK_REWRITES) {
        out = out.replaceAll(from, to);
    }
    return out;
}

function buildLlmsTxt() {
    const docLinks = DOCS.map(
        (d) => `- [${d.title}](${SITE}/llms/${d.slug}): ${d.description}`,
    ).join("\n");

    return `${HEADER}

## Docs

${docLinks}

## Optional

- [Full docs in one file](${SITE}/llms-full.txt): All of the above concatenated
- [API Reference](${SITE}/docs/): TypeDoc-generated API reference (HTML)
- [Live Examples](${SITE}/examples/): Interactive demos
- [Storybook](${SITE}/storybook/): Stories for every effect
- [GitHub](https://github.com/fand/vfx-js): Source code and issues
`;
}

function buildLlmsFullTxt(contents) {
    const parts = [HEADER];
    for (const [doc, text] of contents) {
        parts.push(`---

<!-- Source: ${SITE}/llms/${doc.slug} -->

${text.trim()}`);
    }
    return `${parts.join("\n\n")}\n`;
}

function main() {
    if (!fs.existsSync(DIST)) {
        throw new Error(
            `dist/ not found at ${DIST} — run \`vite build\` before build-llms`,
        );
    }

    const llmsDir = path.join(DIST, "llms");
    fs.mkdirSync(llmsDir, { recursive: true });

    const written = [];
    const write = (filePath, content) => {
        fs.writeFileSync(filePath, content);
        written.push(filePath);
    };

    const contents = DOCS.map((doc) => {
        const text = rewriteLinks(
            fs.readFileSync(path.join(REPO_ROOT, doc.source), "utf8"),
        );
        write(path.join(llmsDir, doc.slug), text);
        return [doc, text];
    });

    for (const asset of ASSETS) {
        const dest = path.join(llmsDir, asset.slug);
        fs.copyFileSync(path.join(REPO_ROOT, asset.source), dest);
        written.push(dest);
    }

    write(path.join(DIST, "llms.txt"), buildLlmsTxt());
    write(path.join(DIST, "llms-full.txt"), buildLlmsFullTxt(contents));

    for (const filePath of written) {
        const size = fs.statSync(filePath).size;
        console.log(`  ${path.relative(DIST, filePath)} (${size} bytes)`);
    }
    console.log(`build-llms: wrote ${written.length} files to ${DIST}`);
}

main();
