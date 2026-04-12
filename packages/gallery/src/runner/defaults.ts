import type { Page } from "@playwright/test";
import type { Scenario, WaitFor } from "./scenario";

/**
 * Applied to any page under `pages/test/**` that has no sibling scenario file.
 * Pages that opt into a scenario file can override any of these fields.
 */
export const DEFAULT_SCENARIO: Scenario = {
    viewport: { width: 1280, height: 720 },
    waitFor: { kind: "flag", name: "__galleryReady" },
    shots: [{ fullPage: false }],
};

/** How long to wait for a readiness signal before failing. */
const WAIT_TIMEOUT_MS = 10_000;

/** Hard-coded fallback that matches DEFAULT_SCENARIO.waitFor. */
const FALLBACK_WAIT: WaitFor = { kind: "flag", name: "__galleryReady" };

/**
 * Execute the scenario's `waitFor` directive using the Playwright page.
 * Extracted so both the runner and ad-hoc scripts can share the semantics.
 */
export async function applyWait(page: Page, w?: WaitFor): Promise<void> {
    const wait = w ?? DEFAULT_SCENARIO.waitFor ?? FALLBACK_WAIT;
    switch (wait.kind) {
        case "flag": {
            const name = wait.name;
            await page.waitForFunction(
                (n) =>
                    Boolean(
                        (window as unknown as Record<string, unknown>)[
                            n as string
                        ],
                    ),
                name,
                { timeout: WAIT_TIMEOUT_MS },
            );
            return;
        }
        case "selector":
            await page.waitForSelector(wait.selector, {
                timeout: WAIT_TIMEOUT_MS,
            });
            return;
        case "function":
            await page.waitForFunction(wait.expression, undefined, {
                timeout: WAIT_TIMEOUT_MS,
            });
            return;
        case "timeout":
            await page.waitForTimeout(wait.ms);
            return;
    }
}
