// Loads the TypeDoc JSON of @vfx-js/core and @vfx-js/effects and maps every
// reflection to a page on this site.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { url } from "../site";
import { type Comment, Kind, type Project, type Reflection } from "./types";

/** Written by `pnpm --filter @vfx-js/core run typedoc`. */
const apiJsonPath = resolve(process.cwd(), "../vfx-js/docs-build/api.json");

export type ApiPackage = {
    /** URL segment, e.g. "core". */
    slug: string;
    /** npm name, e.g. "@vfx-js/core". */
    name: string;
    module: Reflection;
    groups: ApiGroup[];
};

export type ApiGroup = {
    title: string;
    /** Types that exported APIs use, but the package does not export. */
    internal: boolean;
    pages: ApiPage[];
};

export type ApiPage = {
    pkg: ApiPackage;
    decl: Reflection;
    internal: boolean;
    /** Site path without the base, e.g. "docs/core/VFX/". */
    path: string;
};

export type Api = {
    packages: ApiPackage[];
    pages: ApiPage[];
    /** Reflection id → site path (with #anchor for members). */
    paths: Map<number, string>;
    /** Reflection id → reflection, for everything reachable. */
    byId: Map<number, Reflection>;
};

const internalGroup = "Not exported";

const groupOrder = [
    "Classes",
    "Functions",
    "Interfaces",
    "Type Aliases",
    "Variables",
    "Other",
    internalGroup,
];

const groupTitles: Record<string, string> = {
    "Type Aliases": "Types",
};

/** Old TypeDoc folder for each kind, for redirects. */
export const legacyFolders: Record<number, string> = {
    [Kind.Class]: "classes",
    [Kind.Function]: "functions",
    [Kind.Interface]: "interfaces",
    [Kind.TypeAlias]: "types",
    [Kind.Variable]: "variables",
};

export function kindLabel(kind: number): string {
    switch (kind) {
        case Kind.Class:
            return "Class";
        case Kind.Function:
            return "Function";
        case Kind.Interface:
            return "Interface";
        case Kind.TypeAlias:
            return "Type";
        case Kind.Variable:
            return "Variable";
        default:
            return "";
    }
}

let cache: Api | undefined;

export function loadApi(): Api {
    if (cache) {
        return cache;
    }
    let project: Project;
    try {
        project = JSON.parse(readFileSync(apiJsonPath, "utf8"));
    } catch (e) {
        throw new Error(
            `Cannot read ${apiJsonPath}. Build @vfx-js/core first: pnpm --filter @vfx-js/core run build`,
            { cause: e },
        );
    }
    cache = buildApi(project);
    return cache;
}

function buildApi(project: Project): Api {
    const byId = new Map<number, Reflection>();
    const paths = new Map<number, string>();
    const packages: ApiPackage[] = [];
    const pages: ApiPage[] = [];

    const index = (r: Reflection) => {
        walk(r, (child) => {
            byId.set(child.id, child);
        });
    };

    // @vfx-js/effects imports types from @vfx-js/core, and TypeDoc documents
    // them again under effects. Show them once, under core.
    const core = project.children.find((m) => m.name === "@vfx-js/core");
    const coreByName = new Map(
        (core ? declarationsOf(core) : []).map(({ decl }) => [decl.name, decl]),
    );
    const aliases = new Map<number, number>();

    for (const module of project.children) {
        const slug = module.name.replace(/^@vfx-js\//, "");
        const pkg: ApiPackage = { slug, name: module.name, module, groups: [] };

        const byGroup = new Map<string, Reflection[]>();
        for (const { decl, title } of declarationsOf(module)) {
            const original = coreByName.get(decl.name);
            if (
                module !== core &&
                original &&
                decl.sources?.[0]?.fileName.includes("vfx-js/lib/")
            ) {
                aliasTree(decl, original, aliases);
                continue;
            }
            byGroup.set(title, [...(byGroup.get(title) ?? []), decl]);
        }

        const titles = [...byGroup.keys()].sort(
            (a, b) => rank(groupOrder, a) - rank(groupOrder, b),
        );
        for (const title of titles) {
            const group: ApiGroup = {
                title: groupTitles[title] ?? title,
                internal: title === internalGroup,
                pages: [],
            };
            const decls = (byGroup.get(title) ?? []).sort((a, b) =>
                a.name.localeCompare(b.name),
            );
            for (const decl of decls) {
                const page: ApiPage = {
                    pkg,
                    decl,
                    internal: group.internal,
                    path: `docs/${slug}/${decl.name}/`,
                };
                group.pages.push(page);
                pages.push(page);
                index(decl);
                assignPaths(decl, page.path, paths);
            }
            pkg.groups.push(group);
        }
        packages.push(pkg);
    }

    for (const [from, to] of aliases) {
        const path = paths.get(to);
        if (path) {
            paths.set(from, path);
        }
    }

    return { packages, pages, paths, byId };
}

/**
 * Top-level declarations of a package with their group title.
 * Types the package uses but does not export are in TypeDoc's `<internal>`
 * namespace; they get their own group.
 */
function declarationsOf(
    module: Reflection,
): { decl: Reflection; title: string }[] {
    const out: { decl: Reflection; title: string }[] = [];
    for (const decl of module.children ?? []) {
        if (
            decl.name === "<internal>" &&
            decl.kind & (Kind.Module | Kind.Namespace)
        ) {
            for (const inner of decl.children ?? []) {
                out.push({ decl: inner, title: internalGroup });
            }
            continue;
        }
        const title =
            module.groups?.find((g) => g.children.includes(decl.id))?.title ??
            "Other";
        out.push({ decl, title });
    }
    return out;
}

function rank(order: string[], title: string): number {
    const i = order.indexOf(title);
    return i < 0 ? order.length : i;
}

/** Visit a reflection and every reflection inside it. */
export function walk(r: Reflection, fn: (r: Reflection) => void): void {
    fn(r);
    for (const c of r.children ?? []) {
        walk(c, fn);
    }
    for (const s of r.signatures ?? []) {
        walk(s, fn);
    }
    for (const s of r.indexSignatures ?? []) {
        walk(s, fn);
    }
    for (const p of r.parameters ?? []) {
        walk(p, fn);
    }
    for (const p of r.typeParameters ?? []) {
        walk(p, fn);
    }
    if (r.getSignature) {
        walk(r.getSignature, fn);
    }
    if (r.setSignature) {
        walk(r.setSignature, fn);
    }
    if (r.type?.type === "reflection") {
        walk(r.type.declaration, fn);
    }
}

/** The members a page lists: class/interface children, or an object type's properties. */
export function membersOf(decl: Reflection): Reflection[] {
    if (decl.children) {
        return decl.children;
    }
    if (decl.type?.type === "reflection" && decl.type.declaration.children) {
        return decl.type.declaration.children;
    }
    return [];
}

function assignPaths(
    decl: Reflection,
    path: string,
    paths: Map<number, string>,
) {
    // Everything inside points to the page, members to their anchor.
    walk(decl, (r) => {
        paths.set(r.id, path);
    });
    for (const member of membersOf(decl)) {
        walk(member, (r) => {
            paths.set(r.id, `${path}#${member.name}`);
        });
    }
}

function aliasTree(
    copy: Reflection,
    original: Reflection,
    out: Map<number, number>,
) {
    out.set(copy.id, original.id);
    const originals = new Map(membersOf(original).map((m) => [m.name, m]));
    for (const m of membersOf(copy)) {
        const o = originals.get(m.name);
        if (o) {
            walk(m, (r) => out.set(r.id, o.id));
        }
    }
}

/** Site URL (with base) of a reflection, if it has a page. */
export function hrefOf(api: Api, id: number): string | undefined {
    const path = api.paths.get(id);
    return path === undefined ? undefined : url(path);
}

/** The comment of a declaration. Functions have it on the signature. */
export function commentOf(r: Reflection): Comment | undefined {
    return r.comment ?? r.signatures?.[0]?.comment;
}

/** Plain text of the first paragraph of a comment, for meta descriptions. */
export function plainSummary(r: Reflection): string {
    const parts = commentOf(r)?.summary ?? [];
    return parts
        .map((p) => p.text.replace(/^`+|`+$/g, ""))
        .join("")
        .split(/\n\s*\n/)[0]
        .replace(/\s+/g, " ")
        .trim();
}
