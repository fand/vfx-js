import { describe, expect, test } from "vitest";
import { createUATransitions, type NavigationLike } from "./ua-transition";

// A fake Navigation API: fire a navigate event, then move to its entry.
function setup() {
    const navigation = new EventTarget() as NavigationLike & {
        currentEntry: { key: string };
    };
    navigation.currentEntry = { key: "k0" };
    const ua = createUATransitions(navigation);
    const navigate = (
        key: string,
        hasUAVisualTransition: boolean,
        navigationType = "traverse",
    ) => {
        const event = Object.assign(new Event("navigate"), {
            navigationType,
            hasUAVisualTransition,
            destination: { key },
        });
        navigation.dispatchEvent(event);
        navigation.currentEntry = { key };
    };
    return { ua, navigate, navigation };
}

describe("createUATransitions", () => {
    test("is false without a navigation the browser animated", () => {
        const { ua, navigate } = setup();
        expect(ua.take()).toBe(false);
        navigate("k1", false);
        expect(ua.take()).toBe(false);
    });

    test("is true once for a navigation the browser animated", () => {
        const { ua, navigate } = setup();
        navigate("k1", true);
        expect(ua.take()).toBe(true);
        expect(ua.take()).toBe(false);
    });

    test("a later navigation clears it", () => {
        const { ua, navigate } = setup();
        navigate("k1", true);
        navigate("k2", false);
        expect(ua.take()).toBe(false);
    });

    test("a replace on the same entry keeps it", () => {
        const { ua, navigate } = setup();
        navigate("k1", true);
        // Next.js replaces the state right after a traverse.
        navigate("k1", false, "replace");
        expect(ua.take()).toBe(true);
    });

    test("is false once the entry is no longer current", () => {
        const { ua, navigate, navigation } = setup();
        navigate("k1", true);
        navigation.currentEntry = { key: "k2" };
        expect(ua.take()).toBe(false);
    });

    test("is false without the Navigation API", () => {
        expect(createUATransitions(undefined).take()).toBe(false);
    });
});
