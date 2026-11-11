// Fails when the API reference would lose information:
// - a public API uses a type its package does not export. The API pages
//   show only exported types, so such a type shows as a name with no page.
// - a doc comment has a {@link} or a relative link that TypeDoc could not resolve.
// Reads the TypeDoc JSON that @vfx-js/core's build writes.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const apiJson = resolve(root, "packages/vfx-js/docs-build/api.json");

// Types that public APIs may use without exporting them.
const ignored = new Map([
    ["LegacyRevealPreset", "deprecated preset names, kept in ShaderPreset"],
    ["ParamsOf", "a helper inside TransitionSpec"],
]);

let project;
try {
    project = JSON.parse(readFileSync(apiJson, "utf8"));
} catch {
    console.error(
        `Cannot read ${apiJson}. Build @vfx-js/core first: pnpm --filter @vfx-js/core run build`,
    );
    process.exit(1);
}

const isInternal = (r) => r.name === "<internal>";

// Exported names per package. @vfx-js/effects uses core's types, and
// TypeDoc copies them into its <internal>; those are fine.
const exportedAnywhere = new Set(
    project.children.flatMap((m) =>
        (m.children ?? []).filter((c) => !isInternal(c)).map((c) => c.name),
    ),
);

// Every reflection id, to catch links to things TypeDoc left out.
const ids = new Set();
visit(project, "", (node) => {
    if (typeof node.id === "number" && node.variant) {
        ids.add(node.id);
    }
});

const problems = [];

for (const module of project.children) {
    const internal = (module.children ?? []).find(isInternal);
    const hidden = new Map(
        (internal?.children ?? [])
            .filter((c) => !exportedAnywhere.has(c.name))
            .map((c) => [c.id, c.name]),
    );

    for (const decl of module.children ?? []) {
        if (isInternal(decl)) {
            continue;
        }
        visit(decl, decl.name, (node, where) => {
            if (
                node.type === "reference" &&
                typeof node.target === "number" &&
                hidden.has(node.target) &&
                !ignored.has(hidden.get(node.target))
            ) {
                problems.push(
                    `${module.name}: ${where} uses ${hidden.get(node.target)}, which ${module.name} does not export. Export it, or add it to "ignored" in check-api.mjs.`,
                );
            }
            const unresolvedLink =
                (node.kind === "inline-tag" && node.tag === "@link") ||
                node.kind === "relative-link";
            // A number is a page. An object is a symbol outside the docs,
            // which is fine for e.g. lib.dom, not for our own packages.
            const resolves =
                typeof node.target === "number"
                    ? ids.has(node.target)
                    : node.target !== undefined &&
                      !node.target.packageName?.startsWith("@vfx-js/");
            if (unresolvedLink && !resolves) {
                problems.push(
                    `${module.name}: ${where} has a link to "${node.text}" that does not resolve.`,
                );
            }
        });
    }
}

/** Visit every object in a reflection, with the member path for messages. */
function visit(node, where, fn) {
    if (Array.isArray(node)) {
        for (const n of node) {
            visit(n, where, fn);
        }
        return;
    }
    if (!node || typeof node !== "object") {
        return;
    }
    fn(node, where);
    for (const [key, value] of Object.entries(node)) {
        // Name members, but not signatures, params or type literals.
        const named =
            key === "children" && node.variant === "declaration" && node.kind !== 65536;
        if (named && Array.isArray(value)) {
            for (const child of value) {
                visit(child, `${where}.${child.name}`, fn);
            }
        } else {
            visit(value, where, fn);
        }
    }
}

if (problems.length > 0) {
    console.error("The API reference would lose information:\n");
    for (const p of [...new Set(problems)]) {
        console.error(`- ${p}`);
    }
    process.exit(1);
}
console.log("API reference: every type the public API uses has a page, and every link resolves.");
