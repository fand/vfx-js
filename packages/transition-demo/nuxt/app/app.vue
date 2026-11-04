<script setup lang="ts">
import { findPage, pages } from "@vfx-js/transition-demo-shared";

const route = useRoute();
useHead(() => ({ title: `${findPage(route.path).label} | Nuxt` }));
</script>

<template>
    <nav class="nav">
        <NuxtLink
            v-for="p in pages"
            :key="p.path"
            :to="p.path"
            :aria-current="p.path === route.path ? 'page' : undefined"
        >
            {{ p.label }}
        </NuxtLink>
        <span class="framework">Nuxt</span>
    </nav>
    <main class="outlet">
        <NuxtPage />
    </main>
</template>
