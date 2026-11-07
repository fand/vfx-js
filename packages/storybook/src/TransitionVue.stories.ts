import type { Meta, StoryObj } from "@storybook/html-vite";
import { Crossfade } from "@vfx-js/transitions";
import { VFXTransition } from "@vfx-js/vue/nuxt";
import { type App, createApp, h, nextTick, ref } from "vue";
import {
    NEXT_BUTTON_STYLE,
    TRANSITION_BOX_STYLE,
    TRANSITION_PAGES,
    TRANSITION_ROOT_STYLE,
} from "./stories/styles";

let app: App | null = null;

export default {
    title: "Transition/Vue",
    parameters: { layout: "fullscreen" },
    beforeEach: () => () => {
        app?.unmount();
        app = null;
    },
} satisfies Meta<undefined>;

type Location = { path: string };
type Guard = (to: Location, from: Location) => unknown;
type AfterGuard = (to: Location, from: Location, failure?: unknown) => unknown;

// Story-only stand-ins for vue-router and the Nuxt app.
// `<VFXTransition>` reads them from the app.
function createStoryRouter() {
    const before = new Set<Guard>();
    const after = new Set<AfterGuard>();
    const finish = new Set<() => void>();
    return {
        router: {
            beforeEach(guard: Guard) {
                before.add(guard);
                return () => before.delete(guard);
            },
            afterEach(guard: AfterGuard) {
                after.add(guard);
                return () => after.delete(guard);
            },
        },
        nuxtApp: {
            hook(_name: string, fn: () => void) {
                finish.add(fn);
                return () => finish.delete(fn);
            },
        },
        /** Like Nuxt: guards, then the page swap, then afterEach and page:finish. */
        async navigate(from: string, to: string, swap: () => void) {
            await Promise.all(
                [...before].map((guard) => guard({ path: to }, { path: from })),
            );
            swap();
            await nextTick();
            for (const guard of after) {
                guard({ path: to }, { path: from });
            }
            for (const fn of finish) {
                fn();
            }
        },
    };
}

export const pages: StoryObj<undefined> = {
    name: "Pages",
    render: () => document.createElement("div"),
    args: undefined,
};
pages.play = async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(r));
    const storyRouter = createStoryRouter();
    const index = ref(0);
    const next = () => {
        const from = index.value;
        const to = (from + 1) % TRANSITION_PAGES.length;
        void storyRouter.navigate(`/${from}`, `/${to}`, () => {
            index.value = to;
        });
    };

    app = createApp({
        render: () => {
            const page = TRANSITION_PAGES[index.value];
            return h("div", { style: TRANSITION_ROOT_STYLE }, [
                // Outside the target, so the capture never covers it.
                h(
                    "button",
                    { style: NEXT_BUTTON_STYLE, onClick: next },
                    "Next",
                ),
                h(
                    VFXTransition,
                    {
                        transition: Crossfade,
                        duration: 0.8,
                        fullscreen: false,
                        style: TRANSITION_BOX_STYLE,
                    },
                    {
                        default: () =>
                            h("section", { key: index.value }, [
                                h(
                                    "h2",
                                    {
                                        style: `margin:0 0 12px; color:${page.color}`,
                                    },
                                    page.title,
                                ),
                                h(
                                    "p",
                                    { style: "margin:0; line-height:1.6" },
                                    page.body,
                                ),
                            ]),
                    },
                ),
            ]);
        },
    });
    app.config.globalProperties.$router = storyRouter.router;
    (app as unknown as { $nuxt: unknown }).$nuxt = storyRouter.nuxtApp;
    app.mount(canvasElement.firstElementChild as HTMLElement);
};
