import type { NextConfig } from "next";

// Static site served at amagi.dev/vfx-js-transitions.
const config: NextConfig = {
    output: "export",
    basePath: "/vfx-js-transitions",
    // No image server in a static export.
    images: { unoptimized: true },
};

export default config;
