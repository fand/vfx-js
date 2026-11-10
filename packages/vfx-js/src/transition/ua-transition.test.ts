import { describe, expect, test } from "vitest";
import { createUATransitions, type NavigationLike } from "./ua-transition";

// A fake Navigation API: fire a navigate event, then move to its entry.
function setup() {
    const navigation = new EventTarget() as NavigationLike & {
        currentEntry: { key: string };
    };
    navigation.currentEntry = { key: "k0" };
    const input = new EventTarget();
    const ua = createUATransitions(navigation, input);
    const navigate = (
        key: string,
        hasUAVisualTransition: boolean,
        navigationType = "traverse",
    ) => {
        const event = Object.assign(new Event("navigate"), {
            navigationType,
            hasUAVisualTransition,
            // Only a traverse has a destination key.
            destination: { key: navigationType === "traverse" ? key : "" },
        });
        navigation.dispatchEvent(event);
        navigation.currentEntry = { key };
    };
    return { ua, navigate, navigation, input };
}

describe("createUATransitions", () => {
    test("is undefined without a navigation the browser animated", () => {
        const { ua, navigate } = setup();
        expect(ua.current()).toBeUndefined();
        navigate("k1", false);
        expect(ua.current()).toBeUndefined();
    });

    test("gives an id per navigation the browser animated", () => {
        const { ua, navigate } = setup();
        navigate("k1", true);
        const first = ua.current();
        expect(first).toBeDefined();
        expect(ua.current()).toBe(first);
        navigate("k0", true);
        navigate("k1", true);
        expect(ua.current()).not.toBe(first);
    });

    test("a replace on the same entry keeps it", () => {
        const { ua, navigate } = setup();
        navigate("k1", true);
        // Next.js replaces the state right after a traverse.
        navigate("k1", false, "replace");
        expect(ua.current()).toBeDefined();
    });

    test("a later push or traverse clears it", () => {
        const { ua, navigate } = setup();
        navigate("k1", true);
        navigate("k2", false, "push");
        expect(ua.current()).toBeUndefined();
        navigate("k3", true);
        navigate("k2", false);
        expect(ua.current()).toBeUndefined();
    });

    test("user input clears it", () => {
        for (const type of ["pointerdown", "keydown"]) {
            const { ua, navigate, input } = setup();
            navigate("k1", true);
            input.dispatchEvent(new Event(type));
            expect(ua.current()).toBeUndefined();
        }
    });

    test("is undefined once the entry is no longer current", () => {
        const { ua, navigate, navigation } = setup();
        navigate("k1", true);
        navigation.currentEntry = { key: "k2" };
        expect(ua.current()).toBeUndefined();
    });

    test("is undefined without the Navigation API", () => {
        expect(
            createUATransitions(undefined, new EventTarget()).current(),
        ).toBeUndefined();
    });
});
