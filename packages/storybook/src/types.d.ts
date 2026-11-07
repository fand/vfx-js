declare module "*.svg" {
    const img: string;
    export default img;
}
declare module "*.webp" {
    const img: string;
    export default img;
}
declare module "*.mp4" {
    const src: string;
    export default src;
}
declare module "*.webm" {
    const src: string;
    export default src;
}
declare module "*.svelte" {
    import type { Component } from "svelte";

    const component: Component;
    export default component;
}
