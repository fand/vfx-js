import type { NextConfig } from "next";

// Static site served at amagi.dev/vfx-js-transition.
const config: NextConfig = {
    output: "export",
    basePath: "/vfx-js-transition",
    // No image server in a static export.
    images: { unoptimized: true },
};

export default config;
