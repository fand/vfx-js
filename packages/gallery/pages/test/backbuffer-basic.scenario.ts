import { defineScenario } from "../../src/runner/scenario";

/**
 * Exercises the same HTML under two viewports. The runner will take one
 * screenshot per scenario and compare against the committed baseline.
 */
export default defineScenario([
    {
        title: "desktop",
        viewport: { width: 1280, height: 720 },
        shots: [{ name: "viewport", maxDiffPixels: 200 }],
    },
    {
        title: "mobile",
        viewport: { width: 375, height: 667 },
        shots: [{ name: "viewport", maxDiffPixels: 200 }],
    },
]);
