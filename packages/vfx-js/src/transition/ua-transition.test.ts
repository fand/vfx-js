import { describe, expect, test, vi } from "vitest";
import {
    createUATransitions,
    type NavigationLike,
    type WindowLike,
} from "./ua-transition";

const fakeWindow = (href = "https://a.test/"): WindowLike =>
    Object.assign(new EventTarget(), { location: { href } });

// A fake Navigation API: fire a navigate event, then move to its entry.
function setup() {
    const navigation = new EventTarget() as NavigationLike & {
        currentEntry: { key: string };
    };
    navigation.currentEntry = { key: "k0" };
    const input = fakeWindow();
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

    test("ignores popstate when the Navigation API is there", () => {
        const { ua, input } = setup();
        input.dispatchEvent(
            Object.assign(new Event("popstate"), {
                hasUAVisualTransition: true,
            }),
        );
        expect(ua.current()).toBeUndefined();
    });
});

describe("createUATransitions without the Navigation API", () => {
    // Older Safari: the flag is only on popstate.
    const setup = () => {
        const win = fakeWindow("https://a.test/b");
        const ua = createUATransitions(undefined, win);
        const popTo = (href: string, hasUAVisualTransition: boolean) => {
            win.location.href = href;
            win.dispatchEvent(
                Object.assign(new Event("popstate"), {
                    hasUAVisualTransition,
                }),
            );
        };
        return { ua, win, popTo };
    };

    test("reads the flag from popstate", () => {
        const { ua, popTo } = setup();
        expect(ua.current()).toBeUndefined();
        popTo("https://a.test/a", false);
        expect(ua.current()).toBeUndefined();
        popTo("https://a.test/b", true);
        expect(ua.current()).toBeDefined();
    });

    test("listens in the capture phase, ahead of a router's popstate", () => {
        const win = fakeWindow();
        const add = vi.spyOn(win, "addEventListener");
        createUATransitions(undefined, win);
        // Next.js calls run() from its own popstate listener.
        expect(add).toHaveBeenCalledWith(
            "popstate",
            expect.any(Function),
            true,
        );
    });

    test("is undefined once the URL changes", () => {
        const { ua, win, popTo } = setup();
        popTo("https://a.test/a", true);
        // A pushState fires no event.
        win.location.href = "https://a.test/c";
        expect(ua.current()).toBeUndefined();
    });

    test("user input clears it", () => {
        const { ua, win, popTo } = setup();
        popTo("https://a.test/a", true);
        win.dispatchEvent(new Event("pointerdown"));
        expect(ua.current()).toBeUndefined();
    });

    test("is undefined without a window", () => {
        expect(
            createUATransitions(undefined, undefined).current(),
        ).toBeUndefined();
    });
});
