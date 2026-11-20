<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import OuiIcon from './OuiIcon.vue';
import { maximize, minimize } from '../icons';
import { OUI_DASH_MAX } from './OuiDashboard.vue';

/* Maximise and Restore for a widget on an OuiDashboard: put it in the module's header actions. Outside a dashboard it
   draws nothing. The widget is found by the cell it sits in. */
const dash = inject(OUI_DASH_MAX, null);
const el = ref<{ $el: HTMLElement } | null>(null);
const id = ref('');
onMounted(() => { id.value = el.value?.$el.closest<HTMLElement>('.oui-dash-cell')?.dataset.widget ?? ''; });
const on = computed(() => !!dash && !!id.value && dash.max.value === id.value);
const label = computed(() => (dash ? (on.value ? dash.labels().restore : dash.labels().maximize) : ''));
</script>
<template>
  <Button v-if="dash" ref="el" severity="secondary" text size="small" :aria-label="label" :title="label" :aria-pressed="on" data-test="widget-max" @click="dash.toggle(id)">
    <template #icon><OuiIcon :icon="on ? minimize : maximize" :size="14" /></template></Button>
</template>
