<script setup lang="ts">
import { findPage, pages } from "@vfx-js/testbed-shared";
import { Crossfade } from "@vfx-js/transitions";
import { VFXTransition } from "@vfx-js/vue/router";
import { ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
watchEffect(() => {
    document.title = `${findPage(route.path).label} | Vue Router`;
});

// Compare with and without keepPlaying. Crossfade shows both pages at once,
// so you can see whether the old page's clock and spinner keep moving. Kept in the URL, so a reload keeps it.
const keepPlaying = ref(
    new URLSearchParams(location.search).get("keep") === "1",
);
watchEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("keep", keepPlaying.value ? "1" : "0");
    history.replaceState(history.state, "", url);
});
</script>

<template>
    <nav class="nav">
        <RouterLink
            v-for="p in pages"
            :key="p.path"
            :to="{ path: p.path, query: route.query }"
        >
            {{ p.label }}
        </RouterLink>
        <label class="keep">
            <input v-model="keepPlaying" type="checkbox" />
            keepPlaying
        </label>
        <span class="framework">Vue Router</span>
    </nav>
    <VFXTransition
        class="outlet"
        :fullscreen="false"
        :transition="Crossfade"
        :duration="3"
        :keep-playing="keepPlaying"
        auto-reverse
    >
        <RouterView />
    </VFXTransition>
</template>
