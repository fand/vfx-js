// Redirects from the old TypeDoc site, e.g. docs/classes/_vfx-js_core.VFX.html → docs/core/VFX/.
// GitHub Pages has no server redirects, so these are small HTML pages.
import type { APIRoute, GetStaticPaths } from "astro";
import { hrefOf, legacyFolders, loadApi, walk } from "../../api/model";
import { Kind } from "../../api/types";
import { siteUrl, url } from "../../site";

export const getStaticPaths = (() => {
    const api = loadApi();
    const paths = new Map<string, string>();
    const docs = url("docs/");
    paths.set("modules.html", docs);
    paths.set("hierarchy.html", docs);

    for (const pkg of api.packages) {
        const prefix = `_vfx-js_${pkg.slug}`;
        paths.set(`modules/${prefix}.html`, `${docs}#${pkg.slug}`);
        // Every declaration TypeDoc made a page for, including the copies
        // of core types under effects.
        walk(pkg.module, (r) => {
            const folder = legacyFolders[r.kind];
            const href = hrefOf(api, r.id);
            if (!folder || !href || r.kind === Kind.Module) {
                return;
            }
            paths.set(`${folder}/${prefix}.${r.name}.html`, href.split("#")[0]);
        });
    }

    return [...paths].map(([legacy, to]) => ({
        params: { legacy },
        props: { to },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
    const to = String(props.to);
    const abs = new URL(to, siteUrl).href;
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${abs}">
<meta http-equiv="refresh" content="0; url=${to}">
</head>
<body><a href="${to}">${abs}</a></body>
</html>
`;
    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
};
