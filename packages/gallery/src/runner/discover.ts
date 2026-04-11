import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to the gallery package root. */
export const GALLERY_ROOT = path.resolve(__dirname, "..", "..");
/** Absolute path to the `pages/` directory. */
export const PAGES_DIR = path.join(GALLERY_ROOT, "pages");

export interface DiscoveredPage {
    /** Path-like identifier without the extension, e.g. "test/backbuffer-basic". */
    id: string;
    /** First directory segment under `pages/`, e.g. "test" | "tutorial" | "demo". */
    kind: string;
    /** Absolute path to the HTML file. */
    htmlPath: string;
    /** Absolute path to the sibling scenario file, or null. */
    scenarioPath: string | null;
    /** Relative URL path (posix) served by the Vite server, e.g. "pages/test/foo.html". */
    urlPath: string;
}

/**
 * Discover gallery pages on disk. Optionally filter by `kind` (the first
 * subdirectory under `pages/`). The result is stable-sorted by id so that
 * Playwright's test order and snapshot filenames are deterministic.
 */
export function discoverPages(kind?: string): DiscoveredPage[] {
    const pattern = kind ? `${kind}/**/*.html` : "**/*.html";
    return fg
        .sync(pattern, { cwd: PAGES_DIR })
        .sort()
        .map((rel) => {
            const posixRel = rel.split(path.sep).join("/");
            const id = posixRel.replace(/\.html$/, "");
            const scenarioAbs = path.join(PAGES_DIR, `${id}.scenario.ts`);
            const kindSegment = posixRel.split("/")[0] ?? "other";
            return {
                id,
                kind: kindSegment,
                htmlPath: path.join(PAGES_DIR, rel),
                scenarioPath: fs.existsSync(scenarioAbs) ? scenarioAbs : null,
                urlPath: `pages/${posixRel}`,
            };
        });
}
