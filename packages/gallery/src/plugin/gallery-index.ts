import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { Plugin } from "vite";

/**
 * Vite plugin that auto-generates the gallery landing page by scanning
 * `pages/**\/*.html`, grouping by top-level directory (test / tutorial / demo),
 * and replacing a `<!-- GALLERY_INDEX -->` marker in the root `index.html`.
 *
 * The marker is processed via `transformIndexHtml`, so the list stays fresh
 * on every dev-server request and every production build without a separate
 * codegen step. Adding a new page is just "drop an HTML file in pages/".
 */
interface GalleryPage {
    urlPath: string;
    kind: string;
    title: string;
    hasScenario: boolean;
}

function scan(root: string): GalleryPage[] {
    const files = fg.sync("pages/**/*.html", { cwd: root }).sort();
    return files.map((rel) => {
        const posix = rel.split(path.sep).join("/");
        const parts = posix.split("/");
        const kind = parts[1] ?? "other";
        const abs = path.join(root, rel);
        const html = fs.readFileSync(abs, "utf8");
        const m = /<title>([^<]*)<\/title>/i.exec(html);
        const title = m?.[1]?.trim() || posix;
        const scenarioPath = abs.replace(/\.html$/, ".scenario.ts");
        return {
            urlPath: posix,
            kind,
            title,
            hasScenario: fs.existsSync(scenarioPath),
        };
    });
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            default:
                return "&#39;";
        }
    });
}

/** Stable ordering of the top-level kinds when rendering the index. */
const KIND_ORDER = ["test", "tutorial", "demo"];

function kindRank(kind: string): number {
    const i = KIND_ORDER.indexOf(kind);
    return i === -1 ? KIND_ORDER.length : i;
}

function renderIndex(pages: GalleryPage[]): string {
    const groups = new Map<string, GalleryPage[]>();
    for (const p of pages) {
        const bucket = groups.get(p.kind) ?? [];
        bucket.push(p);
        groups.set(p.kind, bucket);
    }
    const kinds = [...groups.keys()].sort(
        (a, b) => kindRank(a) - kindRank(b) || a.localeCompare(b),
    );

    const parts: string[] = [];
    parts.push(`<p class="summary">${pages.length} pages</p>`);
    for (const kind of kinds) {
        const items = groups.get(kind) ?? [];
        parts.push(
            `<section data-kind="${escapeHtml(kind)}">`,
            `<h2>${escapeHtml(kind)} <span class="count">${items.length}</span></h2>`,
            "<ul>",
        );
        for (const p of items) {
            const badge = p.hasScenario
                ? ' <span class="badge" title="has scenario file">scenario</span>'
                : "";
            parts.push(
                "<li>",
                `<a href="/${escapeHtml(p.urlPath)}">${escapeHtml(p.title)}</a>`,
                badge,
                ` <code>${escapeHtml(p.urlPath)}</code>`,
                "</li>",
            );
        }
        parts.push("</ul></section>");
    }
    return parts.join("\n");
}

export function galleryIndex(): Plugin {
    let root = "";
    const MARKER = "<!-- GALLERY_INDEX -->";

    return {
        name: "vfx-js:gallery-index",
        configResolved(config) {
            root = config.root;
        },
        configureServer(server) {
            // Watch the pages dir so that adding/removing HTML files triggers
            // a full reload (re-scan happens in transformIndexHtml).
            const pagesDir = path.join(root, "pages");
            server.watcher.add(pagesDir);
            const handler = (file: string) => {
                if (file.startsWith(pagesDir) && file.endsWith(".html")) {
                    server.ws.send({ type: "full-reload", path: "*" });
                }
            };
            server.watcher.on("add", handler);
            server.watcher.on("unlink", handler);
        },
        transformIndexHtml: {
            order: "pre",
            handler(html, ctx) {
                const indexPath = path.join(root, "index.html");
                if (!ctx.filename) return html;
                if (path.resolve(ctx.filename) !== indexPath) return html;
                const pages = scan(root);
                return html.replace(MARKER, renderIndex(pages));
            },
        },
    };
}
