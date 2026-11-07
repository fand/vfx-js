<!--
  Render children into a shader.
  Uses html-in-canvas when the browser has it, and dom-to-canvas otherwise.
-->
<script lang="ts">
    import { supportsHtmlInCanvas, type VFXProps } from "@vfx-js/core";
    import { onMount, type Snippet } from "svelte";
    import type { Attachment } from "svelte/attachments";
    import type { HTMLAttributes } from "svelte/elements";
    import { bindElement } from "./element.js";

    type Props = VFXProps &
        Omit<HTMLAttributes<HTMLElement>, keyof VFXProps | "children"> & {
            children?: Snippet;
            /** The root element: the `<div>` first, then the `<canvas>` if supported. */
            element?: HTMLElement | null;
        };

    let {
        children,
        element = $bindable(null),
        shader,
        release,
        uniforms,
        overlay,
        intersection,
        overflow,
        wrap,
        zIndex,
        backbuffer,
        autoCrop,
        glslVersion,
        // `effect` would clash with the `$effect` rune.
        effect: effectChain,
        ...attrs
    }: Props = $props();

    function currentProps(): VFXProps {
        const all: Record<string, unknown> = {
            shader,
            release,
            uniforms,
            overlay,
            intersection,
            overflow,
            wrap,
            zIndex,
            backbuffer,
            autoCrop,
            glslVersion,
            effect: effectChain,
        };
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(all)) {
            if (value !== undefined) {
                out[key] = value;
            }
        }
        return out as VFXProps;
    }

    function attach(capture: boolean): Attachment<HTMLElement> {
        return (el) => {
            const controller = bindElement(el, { capture });
            $effect(() => {
                controller.update(currentProps());
            });
            return () => controller.destroy();
        };
    }
    const attachDiv = attach(false);
    const attachCanvas = attach(true);

    // The server and the first client render use the div.
    // After mount, a supporting browser switches to the canvas once;
    // the div is bound only when it stays.
    let mode = $state<"pending" | "div" | "canvas">("pending");
    onMount(() => {
        mode = supportsHtmlInCanvas() ? "canvas" : "div";
    });

    // Older Chrome reads `layoutsubtree`; 159+ reads
    // `content="drawable"` plus `drawable` on the child.
    // Spread, since Svelte's element types don't list them.
    const CANVAS_ATTRS: Record<string, string> = {
        layoutsubtree: "",
        content: "drawable",
    };
    const CHILD_ATTRS: Record<string, string> = { drawable: "" };
</script>

{#if mode === "canvas"}
    <canvas
        {...attrs}
        {...CANVAS_ATTRS}
        bind:this={element}
        {@attach attachCanvas}
    >
        <div {...CHILD_ATTRS}>{@render children?.()}</div>
    </canvas>
{:else}
    <div
        {...attrs}
        bind:this={element}
        {@attach mode === "div" && attachDiv}
    >
        {@render children?.()}
    </div>
{/if}
