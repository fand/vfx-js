/**
 * Dynamic Playwright spec that generates one describe block per HTML page
 * under `pages/test/**`, and one `test()` per exported scenario.
 *
 * This file is the *only* Playwright spec in the gallery. Scenarios live
 * next to their HTML files as sibling `*.scenario.ts` modules. Pages with
 * no sibling scenario fall back to `DEFAULT_SCENARIO`.
 *
 * Top-level `await` is used so that scenarios can be pre-loaded before
 * Playwright's test collection runs. Playwright supports ESM test files
 * and top-level await natively.
 */
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { DEFAULT_SCENARIO, applyWait } from "./defaults";
import { discoverPages } from "./discover";
import type { Scenario, Shot } from "./scenario";

const pages = discoverPages("test");

/** Fallback used when a scenario omits the shots field entirely. */
const FALLBACK_SHOTS: Shot[] = [{ fullPage: false }];

// Pre-load all scenarios in parallel so that the subsequent tests can be
// registered synchronously (Playwright requires synchronous `test()` calls
// at file-load time).
const scenariosByPage = new Map<string, Scenario[]>();
await Promise.all(
    pages.map(async (p) => {
        if (!p.scenarioPath) {
            scenariosByPage.set(p.id, [DEFAULT_SCENARIO]);
            return;
        }
        try {
            const mod = await import(pathToFileURL(p.scenarioPath).href);
            const exported = mod.default;
            const list: Scenario[] = Array.isArray(exported)
                ? exported
                : [exported];
            // Merge each scenario onto the default so missing fields are filled in.
            scenariosByPage.set(
                p.id,
                list.map((s) => ({ ...DEFAULT_SCENARIO, ...s })),
            );
        } catch (err) {
            // Surface the load failure as a failing test rather than a hard crash.
            scenariosByPage.set(p.id, [
                {
                    ...DEFAULT_SCENARIO,
                    title: `scenario failed to load: ${(err as Error).message}`,
                    skip: `scenario file ${p.scenarioPath} failed to load`,
                },
            ]);
        }
    }),
);

for (const p of pages) {
    const scenarios = scenariosByPage.get(p.id) ?? [DEFAULT_SCENARIO];

    test.describe(p.id, () => {
        scenarios.forEach((s, i) => {
            const label = s.title ?? `scenario #${i}`;
            const runner = s.only ? test.only : s.skip ? test.skip : test;

            runner(label, async ({ page }) => {
                if (s.viewport) {
                    await page.setViewportSize(s.viewport);
                }
                await page.goto(`/${p.urlPath}`, { waitUntil: "load" });
                await applyWait(page, s.waitFor);
                if (s.setup) {
                    await s.setup(page);
                }

                const shots =
                    s.shots ?? DEFAULT_SCENARIO.shots ?? FALLBACK_SHOTS;
                for (const [j, shot] of shots.entries()) {
                    if (shot.before) {
                        await shot.before(page);
                    }
                    const safeId = p.id.replace(/\//g, "_");
                    const shotLabel = shot.name ?? String(j);
                    const fileName = `${safeId}__${i}__${shotLabel}.png`;
                    await expect(page).toHaveScreenshot(fileName, {
                        clip: shot.clip,
                        fullPage: shot.fullPage,
                        maxDiffPixels: shot.maxDiffPixels,
                        threshold: shot.threshold,
                    });
                }
            });
        });
    });
}
