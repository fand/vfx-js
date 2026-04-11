import type { Page } from "@playwright/test";

/**
 * When/how to wait for the page to be ready for screenshotting.
 * Defaults to `{ kind: "flag", name: "__galleryReady" }` — that is, the page
 * should set `window.__galleryReady = true` once its shaders/DOM are settled.
 */
export type WaitFor =
    | { kind: "flag"; name: string }
    | { kind: "selector"; selector: string }
    | { kind: "function"; expression: string }
    | { kind: "timeout"; ms: number };

/**
 * A single screenshot to take within a scenario.
 * A scenario can take multiple shots (e.g. scroll to different positions).
 */
export interface Shot {
    /** Used in the snapshot filename. Defaults to the shot index. */
    name?: string;
    /** Crop the screenshot to a region. */
    clip?: { x: number; y: number; width: number; height: number };
    /** Capture the entire scrollable page instead of the viewport. */
    fullPage?: boolean;
    /** Passed to Playwright's toHaveScreenshot(). */
    maxDiffPixels?: number;
    /** Passed to Playwright's toHaveScreenshot(). */
    threshold?: number;
    /** Run arbitrary Playwright actions right before this shot is captured. */
    before?: (page: Page) => Promise<void>;
}

/**
 * A scenario fully describes how to drive a single gallery page under test.
 * Each HTML file in `pages/test/**` may have a sibling `*.scenario.ts` file
 * that exports one or more scenarios via `defineScenario()`. Pages without
 * a sibling file fall back to `DEFAULT_SCENARIO`.
 */
export interface Scenario {
    /** Shown in the Playwright test name and the snapshot filename. */
    title?: string;
    /** Free-form tags, currently informational. */
    tags?: string[];
    /** `test.skip()` the scenario. String is reported as the reason. */
    skip?: boolean | string;
    /** `test.only()` the scenario. Use locally; CI forbids `.only`. */
    only?: boolean;

    /** Playwright viewport. Defaults to 1280x720. */
    viewport?: { width: number; height: number };
    /** Playwright device pixel ratio. Defaults to 1. */
    deviceScaleFactor?: number;
    colorScheme?: "light" | "dark";
    reducedMotion?: "reduce" | "no-preference";

    /** Page readiness signal. Defaults to `window.__galleryReady === true`. */
    waitFor?: WaitFor;
    /** Runs after page.goto()+waitFor, before any shot is taken. */
    setup?: (page: Page) => Promise<void>;
    /** Screenshots to take. Defaults to a single viewport shot. */
    shots?: Shot[];
}

/**
 * Helper to get type inference in scenario files:
 *
 *     import { defineScenario } from "../../src/runner/scenario";
 *     export default defineScenario({ viewport: { width: 375, height: 667 } });
 *
 * Also accepts an array to express multiple scenarios for the same HTML
 * (e.g. different viewports, different interactions).
 */
export function defineScenario(s: Scenario | Scenario[]): Scenario[] {
    return Array.isArray(s) ? s : [s];
}
