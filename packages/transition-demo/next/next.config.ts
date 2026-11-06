import type { NextConfig } from "next";

// Static site served at amagi.dev/vfx-js-transition.
const config: NextConfig = {
    output: "export",
    basePath: "/vfx-js-transition",
    trailingSlash: true,
};

export default config;
