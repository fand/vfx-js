/// <reference path="./html-in-canvas.d.ts" />

let supported: boolean | undefined;

export function supportsHtmlInCanvas(): boolean {
    if (supported !== undefined) {
        return supported;
    }

    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        supported = ctx !== null && typeof ctx.drawElementImage === "function";
    } catch {
        supported = false;
    }

    return supported;
}
