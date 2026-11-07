<script lang="ts">
    import { VFXTransition } from "@vfx-js/svelte/sveltekit";
    import { Crossfade } from "@vfx-js/transitions";
    import {
        NEXT_BUTTON_STYLE,
        TRANSITION_BOX_STYLE,
        TRANSITION_PAGES,
        TRANSITION_ROOT_STYLE,
    } from "../styles";
    import { storyNavigate } from "./story-navigation";

    let index = $state(0);
    const page = $derived(TRANSITION_PAGES[index]);

    function next() {
        const from = index;
        const to = (from + 1) % TRANSITION_PAGES.length;
        void storyNavigate(`/${from}`, `/${to}`, () => {
            index = to;
        });
    }
</script>

<div style={TRANSITION_ROOT_STYLE}>
    <!-- Outside the target, so the capture never covers it. -->
    <button style={NEXT_BUTTON_STYLE} onclick={next}>Next</button>
    <VFXTransition
        transition={Crossfade}
        duration={0.8}
        fullscreen={false}
        style={TRANSITION_BOX_STYLE}
    >
        {#key index}
            <section>
                <h2 style="margin:0 0 12px; color:{page.color}">{page.title}</h2>
                <p style="margin:0; line-height:1.6">{page.body}</p>
            </section>
        {/key}
    </VFXTransition>
</div>
