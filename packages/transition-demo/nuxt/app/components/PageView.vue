<script setup lang="ts">
import { findPage } from "@vfx-js/transition-demo-shared";

const props = defineProps<{ path: string }>();
const page = computed(() => findPage(props.path));
</script>

<template>
    <section class="page" :style="{ background: page.theme }">
        <h1>{{ page.title }}</h1>
        <p>{{ page.lead }}</p>
        <div v-if="page.images.length > 0" class="grid">
            <img v-for="src in page.images" :key="src" :src="src" alt="" crossorigin="anonymous" />
        </div>
    </section>
</template>
