import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { Plugin } from "vite";

/**
 * Vite plugin that scans `pages/**\/*.html` and `public/__screenshots__/**`,
 * then injects a JSON manifest into the gallery viewer's `index.html` via
 * the `<!-- GALLERY_MANIFEST -->` marker.
 *
 * The viewer (`src/viewer/main.ts`) reads the manifest from a
 * `<script id="manifest-data" type="application/json">` element and renders
 * the interactive grid client-side. Adding or removing a page / snapshot
 * is always a pure file-system operation — no registry to update.
 */

interface Snapshot {
    /** URL path, e.g. `/__screenshots__/chromium/test_backbuffer-basic__0__viewport.png`. */
    url: string;
    /** Base filename for display. */
    filename: string;
    /** Playwright project name parsed from the path, if discoverable. */
    project: string | null;
}

interface GalleryPage {
    /** e.g. `test/backbuffer-basic`. */
    id: string;
    /** URL path of the HTML file, e.g. `pages/test/backbuffer-basic.html`. */
    urlPath: string;
    /** Top-level bucket: test | tutorial | demo | ... */
    kind: string;
    /** Extracted <title>. */
    title: string;
    /** True if a sibling `*.scenario.ts` exists. */
    hasScenario: boolean;
    /** Baseline screenshots matched to this page, sorted by filename. */
    snapshots: Snapshot[];
}

interface Manifest {
    generatedAt: string;
    pages: GalleryPage[];
}

/** Playwright encodes `id` into snapshot filenames by replacing `/` with `_`. */
function safeId(id: string): string {
    return id.replace(/\//g, "_");
}

function scan(root: string): Manifest {
    const htmlFiles = fg.sync("pages/**/*.html", { cwd: root }).sort();
    const snapshotFiles = fg
        .sync("public/__screenshots__/**/*.png", { cwd: root })
        .sort();

    const pages: GalleryPage[] = htmlFiles.map((rel) => {
        const posix = rel.split(path.sep).join("/");
        const id = posix.replace(/^pages\//, "").replace(/\.html$/, "");
        const parts = posix.split("/");
        const kind = parts[1] ?? "other";
        const abs = path.join(root, rel);
        const html = fs.readFileSync(abs, "utf8");
        const match = /<title>([^<]*)<\/title>/i.exec(html);
        const title = match?.[1]?.trim() || posix;
        const scenarioPath = abs.replace(/\.html$/, ".scenario.ts");
        const prefix = `${safeId(id)}__`;
        const snapshots: Snapshot[] = snapshotFiles
            .filter((s) => path.basename(s).startsWith(prefix))
            .map((s) => {
                // strip "public/" → serve as absolute URL path
                const urlPath = `/${s.split(path.sep).slice(1).join("/")}`;
                const segments = s.split(path.sep);
                // public/__screenshots__/<project>/<file>
                const project = segments.length >= 4 ? segments[2] : null;
                return {
                    url: urlPath,
                    filename: path.basename(s),
                    project: project ?? null,
                };
            });
        return {
            id,
            urlPath: posix,
            kind,
            title,
            hasScenario: fs.existsSync(scenarioPath),
            snapshots,
        };
    });

    return {
        generatedAt: new Date().toISOString(),
        pages,
    };
}

export function galleryIndex(): Plugin {
    let root = "";
    const MARKER = "<!-- GALLERY_MANIFEST -->";

    return {
        name: "vfx-js:gallery-index",
        configResolved(config) {
            root = config.root;
        },
        configureServer(server) {
            // Watch pages/ and the snapshot dir so that adding/removing
            // files triggers a full reload (re-scan happens when the
            // viewer re-requests index.html).
            const pagesDir = path.join(root, "pages");
            const snapsDir = path.join(root, "public", "__screenshots__");
            server.watcher.add(pagesDir);
            server.watcher.add(snapsDir);
            const handler = (file: string) => {
                if (
                    (file.startsWith(pagesDir) && file.endsWith(".html")) ||
                    (file.startsWith(snapsDir) && file.endsWith(".png"))
                ) {
                    server.ws.send({ type: "full-reload", path: "*" });
                }
            };
            server.watcher.on("add", handler);
            server.watcher.on("unlink", handler);
            server.watcher.on("change", handler);
        },
        transformIndexHtml: {
            order: "pre",
            handler(html, ctx) {
                const indexPath = path.join(root, "index.html");
                if (!ctx.filename) return html;
                if (path.resolve(ctx.filename) !== indexPath) return html;
                const manifest = scan(root);
                // Escape `</script>` inside JSON so it can't break out of the
                // surrounding <script> element.
                const json = JSON.stringify(manifest).replace(
                    /<\/script/gi,
                    "<\\/script",
                );
                return html.replace(MARKER, json);
            },
        },
    };
}
