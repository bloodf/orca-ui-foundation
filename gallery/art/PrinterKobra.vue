<script setup lang="ts">
import { computed } from 'vue';
// Drawn for the gallery: a generic bed-slinger with a four-spool box beside it. No brand geometry, no text. The spools take
// the slots' filament colours and the print grows with the job, so the picture is data, not decoration.
const props = defineProps<{ colors: (string | null)[]; progress?: number | null; size?: number; stale?: boolean }>();
const h = computed(() => 3 + Math.max(0, Math.min(100, props.progress ?? 0)) * 0.2);
const SPOTS = [[88, 46], [104, 46], [88, 66], [104, 66]];
</script>
<template>
  <svg class="art-printer" :data-stale="stale || undefined" :width="(size ?? 96) * 1.25" :height="size ?? 96" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
    <rect class="art-body" x="8" y="10" width="62" height="74" rx="6" />
    <path class="art-line" d="M8 24h62M14 38h50" />
    <path class="art-tube" d="M96 32C96 12 42 10 39 30" />
    <rect class="art-head" x="32" y="30" width="14" height="13" rx="2.5" /><path class="art-head" d="M36 43l3 4 3-4z" />
    <rect class="art-print" x="29" :y="66 - h" width="20" :height="h" rx="2" />
    <rect class="art-bed" x="15" y="66" width="48" height="5" rx="2" />
    <rect class="art-body" x="78" y="32" width="36" height="52" rx="6" />
    <template v-for="(spot, i) in SPOTS" :key="i">
      <circle class="art-spool" :cx="spot[0]" :cy="spot[1]" r="6.5" :style="colors[i] ? { fill: colors[i]! } : undefined" :data-empty="!colors[i] || undefined" />
      <circle class="art-hub" :cx="spot[0]" :cy="spot[1]" r="2" />
    </template>
  </svg>
</template>
