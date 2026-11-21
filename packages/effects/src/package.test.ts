// The package's entry points: the exports map, the sideEffects that keep the static entry's registration, and the
// typesVersions that resolve `holo/static`'s types under moduleResolution "node".
import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

test("./holo/static maps to holo-static in both builds", () => {
    const e = pkg.exports["./holo/static"];
    expect(e.import).toEqual({
        types: "./lib/esm/holo-static.d.ts",
        default: "./lib/esm/holo-static.js",
    });
    expect(e.require).toEqual({
        types: "./lib/cjs/holo-static.d.ts",
        default: "./lib/cjs/holo-static.js",
    });
    expect(existsSync(new URL("src/holo-static.ts", root))).toBe(true);
});

test("sideEffects keeps holo-static, from the package root and from the copies in lib/esm and lib/cjs", () => {
    // tsconfig-to-dual-package copies package.json into lib/esm and lib/cjs, where paths are relative to that folder
    expect(pkg.sideEffects).toEqual(
        expect.arrayContaining([
            "./lib/esm/holo-static.js",
            "./lib/cjs/holo-static.js",
            "./holo-static.js",
        ]),
    );
});

test("typesVersions points holo/static at its types", () => {
    expect(pkg.typesVersions?.["*"]?.["holo/static"]).toEqual([
        "lib/esm/holo-static.d.ts",
    ]);
});
