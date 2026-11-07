<script lang="ts">
    import VFXCanvas from "../lib/VFXCanvas.svelte";

    let {
        props = {},
        text = "hi",
        onElement,
    }: {
        props?: Record<string, unknown>;
        text?: string;
        onElement?: (el: HTMLElement | null) => void;
    } = $props();

    let element: HTMLElement | null = null;
</script>

<!-- A function binding sees every element, even within one flush. -->
<VFXCanvas
    {...props}
    bind:element={
        () => element,
        (el) => {
            element = el;
            onElement?.(el);
        }
    }
>
    <h2>{text}</h2>
</VFXCanvas>
