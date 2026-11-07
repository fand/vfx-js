<script lang="ts">
    import { findPage } from "@vfx-js/transition-demo-shared";

    let { path }: { path: string } = $props();
    const page = $derived(findPage(path));
</script>

<section class="page" style:background={page.theme}>
    <h1>{page.title}</h1>
    <p>{page.lead}</p>
    {#if page.images.length > 0}
        <div class="grid">
            {#each page.images as src (src)}
                <img {src} alt="" crossorigin="anonymous" />
            {/each}
        </div>
    {/if}
</section>
