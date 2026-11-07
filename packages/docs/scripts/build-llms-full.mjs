// Builds dist/llms-full.txt from the vfx-js agent skill.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(here, "../../../skills/vfx-js");
const out = resolve(here, "../dist/llms-full.txt");

const files = [
    "SKILL.md",
    "references/shader.md",
    "references/effects.md",
    "references/transitions.md",
];

const anchors = {
    "references/shader.md": "#custom-shaders-shader-option",
    "references/effects.md": "#effects-effect-option",
    "references/transitions.md": "#transitions-addtransition-vfx-jstransitions",
};

const parts = files.map((file) => {
    let text = readFileSync(resolve(skillDir, file), "utf8");
    // Drop the skill frontmatter.
    text = text.replace(/^---\n[\s\S]*?\n---\n/, "");
    // Links between the files point to sections of this one file.
    for (const [path, anchor] of Object.entries(anchors)) {
        const name = path.replace("references/", "");
        text = text.replaceAll(`(${path})`, `(${anchor})`);
        text = text.replaceAll(`(${name})`, `(${anchor})`);
    }
    return text.trim();
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${parts.join("\n\n---\n\n")}\n`);
console.log(`Wrote ${out}`);
