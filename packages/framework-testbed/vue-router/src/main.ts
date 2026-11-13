import "@vfx-js/testbed-shared/style.css";
import "./live.css";
import { pages } from "@vfx-js/testbed-shared";
import { createApp, h } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import PageView from "./PageView.vue";

const headingShaders: Record<string, string> = { "/about": "rgbShift" };

const router = createRouter({
    history: createWebHistory(),
    routes: pages.map((p) => ({
        path: p.path,
        component: {
            render: () =>
                h(PageView, {
                    path: p.path,
                    headingShader: headingShaders[p.path],
                }),
        },
    })),
});

createApp(App).use(router).mount("#app");
