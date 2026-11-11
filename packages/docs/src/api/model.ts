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
    pages: ApiPage[];
};

export type ApiPage = {
    pkg: ApiPackage;
    decl: Reflection;
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

const groupOrder = [
    "Classes",
    "Functions",
    "Interfaces",
    "Type Aliases",
    "Variables",
    "Other",
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
        (core ? declarationsOf(core) : [])
            .filter((d) => !d.internal)
            .map(({ decl }) => [decl.name, decl]),
    );
    const aliases = new Map<number, number>();

    for (const module of project.children) {
        const slug = module.name.replace(/^@vfx-js\//, "");
        const pkg: ApiPackage = { slug, name: module.name, module, groups: [] };

        const byGroup = new Map<string, Reflection[]>();
        for (const { decl, title, internal } of declarationsOf(module)) {
            // Indexed for lookups, e.g. the interface a class implements.
            index(decl);
            const original = coreByName.get(decl.name);
            if (
                module !== core &&
                original &&
                decl.sources?.[0]?.fileName.includes("vfx-js/lib/")
            ) {
                aliasTree(decl, original, aliases);
                continue;
            }
            if (internal) {
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
                pages: [],
            };
            const decls = (byGroup.get(title) ?? []).sort((a, b) =>
                a.name.localeCompare(b.name),
            );
            for (const decl of decls) {
                const page: ApiPage = {
                    pkg,
                    decl,
                    path: `docs/${slug}/${decl.name}/`,
                };
                group.pages.push(page);
                pages.push(page);
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

    const api = { packages, pages, paths, byId };

    // Hidden members link to the interface member they copy.
    for (const page of pages) {
        for (const m of membersOf(page.decl)) {
            const original = interfaceMemberOf(api, m);
            const path = original && paths.get(original.id);
            if (path) {
                walk(m, (r) => paths.set(r.id, path));
            }
        }
    }

    return api;
}

/**
 * Top-level declarations of a package with their group title.
 * TypeDoc puts types that exported APIs use, but the package does not
 * export, in an `<internal>` namespace. Those get no page.
 */
type Declaration = { decl: Reflection; title: string; internal: boolean };

function declarationsOf(module: Reflection): Declaration[] {
    const out: Declaration[] = [];
    for (const decl of module.children ?? []) {
        if (
            decl.name === "<internal>" &&
            decl.kind & (Kind.Module | Kind.Namespace)
        ) {
            for (const inner of decl.children ?? []) {
                out.push({ decl: inner, title: "", internal: true });
            }
            continue;
        }
        const title =
            module.groups?.find((g) => g.children.includes(decl.id))?.title ??
            "Other";
        out.push({ decl, title, internal: false });
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

/**
 * Class members that only implement an interface member and repeat its
 * docs, e.g. `render()` on every effect. The interface page documents them.
 */
export function isInterfaceCopy(api: Api, member: Reflection): boolean {
    return interfaceMemberOf(api, member) !== undefined;
}

/** The interface member that a hidden class member copies. */
export function interfaceMemberOf(
    api: Api,
    member: Reflection,
): Reflection | undefined {
    // Inherited from a member that is hidden itself, e.g. Crossfade gets
    // `render()` from ShaderTransition, which gets it from Transition.
    const parent = member.inheritedFrom;
    if (parent?.type === "reference" && typeof parent.target === "number") {
        const original = api.byId.get(parent.target);
        if (original && ownerOf(api, original)) {
            return interfaceMemberOf(api, original);
        }
    }
    const impl = member.implementationOf;
    if (impl?.type !== "reference" || typeof impl.target !== "number") {
        return undefined;
    }
    const original = api.byId.get(impl.target);
    return original && docsOf(member) === docsOf(original)
        ? original
        : undefined;
}

/** The class or interface a member belongs to. */
function ownerOf(api: Api, member: Reflection): Reflection | undefined {
    for (const page of api.pages) {
        if (membersOf(page.decl).includes(member)) {
            return page.decl;
        }
    }
    return undefined;
}

function docsOf(r: Reflection): string {
    const comments = [
        r.comment,
        ...(r.signatures ?? []).map((s) => s.comment),
        r.getSignature?.comment,
        r.setSignature?.comment,
    ];
    return JSON.stringify(comments.find(Boolean) ?? null);
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
