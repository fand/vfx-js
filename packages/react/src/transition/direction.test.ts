import { afterEach, describe, expect, it, vi } from "vitest";
import { watchNavigationDirection } from "./direction.js";

function navigateEvent(navigationType: string, index?: number): Event {
    const event = new Event("navigate");
    return Object.assign(event, {
        navigationType,
        destination: index === undefined ? undefined : { index },
    });
}

describe("watchNavigationDirection", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("uses the Navigation API: back only on a traverse to an earlier entry", () => {
        const navigation = Object.assign(new EventTarget(), {
            currentEntry: { index: 3 },
        });
        vi.stubGlobal("window", { navigation });
        const onBack = vi.fn();
        const stop = watchNavigationDirection(onBack);

        navigation.dispatchEvent(navigateEvent("push", 4));
        navigation.dispatchEvent(navigateEvent("traverse", 4));
        expect(onBack).not.toHaveBeenCalled();
        navigation.dispatchEvent(navigateEvent("traverse", 2));
        expect(onBack).toHaveBeenCalledOnce();
        navigation.dispatchEvent(navigateEvent("traverse"));
        expect(onBack).toHaveBeenCalledTimes(2);

        stop();
        navigation.dispatchEvent(navigateEvent("traverse", 1));
        expect(onBack).toHaveBeenCalledTimes(2);
    });

    it("falls back to popstate", () => {
        const target = new EventTarget();
        vi.stubGlobal("window", target);
        const onBack = vi.fn();
        const stop = watchNavigationDirection(onBack);
        target.dispatchEvent(new Event("popstate"));
        expect(onBack).toHaveBeenCalledOnce();
        stop();
        target.dispatchEvent(new Event("popstate"));
        expect(onBack).toHaveBeenCalledOnce();
    });
});
