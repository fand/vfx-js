import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the gallery visual regression suite.
 *
 * - `testDir` points at the dynamic runner which generates one test per
 *   scenario by scanning `pages/test/**`.
 * - Snapshots live in `__screenshots__/` at the package root and are
 *   expected to be committed to the repo.
 * - The dev server is booted via `webServer`. CI uses `build + preview`
 *   so that the tested bundle mirrors what ends up on docs; locally we
 *   just run vite dev for faster feedback.
 */
const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "./src/runner",
    testMatch: "**/*.spec.ts",
    // Snapshots live under `public/` so that Vite serves them at
    // `/__screenshots__/...` in both dev and build. That lets the gallery
    // viewer embed the baseline PNGs next to the live iframes.
    snapshotDir: "./public/__screenshots__",
    snapshotPathTemplate:
        "{snapshotDir}/{projectName}/{arg}{ext}",
    outputDir: "./test-results",

    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: isCI ? 1 : undefined,
    reporter: isCI
        ? [["github"], ["html", { open: "never" }]]
        : [["list"], ["html", { open: "never" }]],

    expect: {
        toHaveScreenshot: {
            maxDiffPixels: 100,
            threshold: 0.2,
            animations: "disabled",
            caret: "hide",
        },
    },

    use: {
        baseURL: "http://localhost:3002",
        trace: "on-first-retry",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        colorScheme: "light",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],

    webServer: {
        command: isCI
            ? "npm run build && npm run preview"
            : "npm run dev -- --port 3002 --strictPort",
        url: "http://localhost:3002",
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
    },
});
