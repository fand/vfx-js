<script setup lang="ts">
import { findPage, pages } from "@vfx-js/transition-demo-shared";
import { presets } from "@vfx-js/transition-demo-shared/transitions";
import { Swipe } from "@vfx-js/transitions";
import { vTransition } from "@vfx-js/vue";
import { VFXTransition } from "@vfx-js/vue/nuxt";

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
            v-transition="{ transition: presets[p.transition] }"
        >
            {{ p.label }}
        </NuxtLink>
        <span class="framework">Nuxt</span>
    </nav>
    <!-- Back plays the default, Swipe, reversed. -->
    <VFXTransition
        class="outlet"
        :fullscreen="false"
        :transition="Swipe"
        :duration="0.8"
    >
        <NuxtPage />
    </VFXTransition>
</template>
