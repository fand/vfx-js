<script lang="ts">
    import { vfx } from "@vfx-js/svelte";
    import { findPage } from "@vfx-js/transition-demo-shared";

    let { path, headingShader }: { path: string; headingShader?: string } =
        $props();
    const page = $derived(findPage(path));
</script>

<section class="page" style:background={page.theme}>
    <h1 {@attach vfx(() => (headingShader ? { shader: headingShader } : null))}>
        {page.title}
    </h1>
    <p>{page.lead}</p>
    {#if page.images.length > 0}
        <div class="grid">
            {#each page.images as src (src)}
                <img {src} alt="" crossorigin="anonymous" />
            {/each}
        </div>
    {/if}
</section>
