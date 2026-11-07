// Fails when the public API has something the agent skill does not mention.
// Checks every value export, every package subpath, and every shader preset.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const skillDir = join(root, "skills/vfx-js");

// Package dir → entry file for each subpath in its package.json "exports".
const packages = {
    "vfx-js": { ".": "src/index.ts" },
    react: {
        ".": "src/index.ts",
        "./next": "src/next/index.tsx",
        "./react-router": "src/react-router/index.tsx",
    },
    vue: {
        ".": "src/index.ts",
        "./nuxt": "src/nuxt/index.ts",
        "./router": "src/router/index.ts",
    },
    svelte: {
        ".": "src/lib/index.ts",
        "./sveltekit": "src/lib/sveltekit/index.ts",
    },
    effects: { ".": "src/index.ts" },
    transitions: { ".": "src/index.ts" },
};

// Exports the skill leaves out on purpose.
const ignored = new Set([
    // Low-level html-in-canvas helpers for building the wrapper by hand.
    "isHicCanvas",
    "markHicCanvas",
    "setupCapture",
    "teardownCapture",
    // Shader sources for advanced use.
    "DEFAULT_VERTEX_SHADER",
    "DEFAULT_VERTEX_SHADER_100",
    "COPY_FRAGMENT_SHADER",
    "shaders",
    // Constant tables shown by the effect's own types.
    "ASCII_PRESETS",
    "MATRIX_GLYPHS",
    // React context and hooks for the rare custom setup.
    "VFXContext",
    "useVFX",
]);

function readSkill() {
    const files = ["SKILL.md"];
    for (const f of readdirSync(join(skillDir, "references"))) {
        files.push(join("references", f));
    }
    return files.map((f) => readFileSync(join(skillDir, f), "utf8")).join("\n");
}

function valueExports(file) {
    const program = ts.createProgram([file], {
        allowJs: true,
        jsx: ts.JsxEmit.Preserve,
        noEmit: true,
        skipLibCheck: true,
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(file);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
        throw new Error(`Cannot read exports of ${file}`);
    }
    const names = [];
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        let target = symbol;
        if (symbol.flags & ts.SymbolFlags.Alias) {
            target = checker.getAliasedSymbol(symbol);
        }
        // Unresolved targets (e.g. .svelte files) count as values.
        const unknown = !target.declarations;
        const typeOnly = !unknown && !(target.flags & ts.SymbolFlags.Value);
        if (!typeOnly) {
            names.push(symbol.name);
        }
    }
    return names;
}

function shaderPresets() {
    const src = readFileSync(join(root, "packages/vfx-js/src/constants.ts"), "utf8");
    const union = src.match(/export type ShaderPreset =([^;]+);/);
    return [...(union?.[1] ?? "").matchAll(/"(\w+)"/g)].map((m) => m[1]);
}

const skill = readSkill();
const mentioned = (word) => new RegExp(`\\b${word}\\b`).test(skill);
const missing = [];
let checked = 0;

for (const [dir, entries] of Object.entries(packages)) {
    const pkg = JSON.parse(
        readFileSync(join(root, "packages", dir, "package.json"), "utf8"),
    );
    // "exports" with only conditions (import/require) means one entry, ".".
    const keys = Object.keys(pkg.exports ?? {});
    const subpaths = keys.some((k) => k.startsWith(".")) ? keys : ["."];
    for (const subpath of subpaths) {
        if (subpath === "./package.json") continue;
        const entry = entries[subpath];
        if (!entry) {
            missing.push(`${pkg.name}: add "${subpath}" to packages in check-skill.mjs`);
            continue;
        }
        const name = subpath === "." ? pkg.name : `${pkg.name}${subpath.slice(1)}`;
        if (!skill.includes(name)) {
            missing.push(`${name}: import path not mentioned`);
        }
        for (const exp of valueExports(join(root, "packages", dir, entry))) {
            checked++;
            if (!ignored.has(exp) && !mentioned(exp)) {
                missing.push(`${name}: export "${exp}" not mentioned`);
            }
        }
    }
}

for (const preset of shaderPresets()) {
    if (!mentioned(preset)) {
        missing.push(`@vfx-js/core: shader preset "${preset}" not mentioned`);
    }
}

if (missing.length > 0) {
    console.error("skills/vfx-js is out of date with the public API:\n");
    for (const m of missing) console.error(`  - ${m}`);
    console.error(
        "\nUpdate skills/vfx-js, or add the name to `ignored` in packages/docs/scripts/check-skill.mjs.",
    );
    process.exit(1);
}
console.log(`skills/vfx-js covers the public API (${checked} exports).`);
