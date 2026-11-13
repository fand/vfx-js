<script setup lang="ts">
import { findPage, pages } from "@vfx-js/testbed-shared";
import { vVfx } from "@vfx-js/vue";
import { computed, onBeforeUnmount, ref } from "vue";

const props = defineProps<{ path: string; headingShader?: string }>();
const page = computed(() => findPage(props.path));
// Each page puts its live row lower, so the old and new rows don't overlap.
const row = computed(() => pages.findIndex((p) => p.path === props.path));

// Live content for keepPlaying. On the old page during the run, the CSS
// animation keeps playing, and the clock stops: Vue has unmounted the page.
const start = performance.now();
const elapsed = ref(0);
let frame = requestAnimationFrame(function tick() {
    elapsed.value = (performance.now() - start) / 1000;
    frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
    <section class="page" :style="{ background: page.theme }">
        <h1 v-vfx="headingShader ? { shader: headingShader } : null">{{ page.title }}</h1>
        <p>{{ page.lead }}</p>
        <div class="live" :style="{ marginTop: `${24 + row * 72}px` }">
            <div class="spinner" />
            <span class="label">CSS animation</span>
            <span class="clock">{{ elapsed.toFixed(2) }}s</span>
            <span class="label">Vue state</span>
        </div>
        <div v-if="page.images.length > 0" class="grid">
            <img v-for="src in page.images" :key="src" :src="src" alt="" crossorigin="anonymous" />
        </div>
    </section>
</template>
