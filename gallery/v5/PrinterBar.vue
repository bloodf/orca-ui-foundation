<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import { OuiAppBar, OuiIcon, OuiStatus, type OuiState } from '../../src/components';
import * as I from '../../src/icons';
import { t } from '../i18n';
import { MARKS } from '../marks';
// MOCK — the app bar the two printer plugins share: mark, name, tabs (Stock is its own tab since 5.0), state, emergency stop.
const props = defineProps<{ plugin: 'u1' | 'kobra'; tab: string; state?: OuiState; stateLabel?: string }>();
const tab = ref(props.tab);
const tabs = [
  { value: 'dashboard', label: t('Dashboard', 'Painel'), icon: I.dashboard },
  { value: 'stock', label: t('Stock', 'Estoque'), icon: I.spool, count: 57 },
  { value: 'files', label: t('Files', 'Arquivos'), icon: I.files },
  ...(props.plugin === 'u1' ? [{ value: 'console', label: 'Console', icon: I.terminal }] : []),
  { value: 'settings', label: t('Settings', 'Ajustes'), icon: I.settings },
];
</script>
<template>
  <OuiAppBar v-model="tab" :name="plugin === 'u1' ? 'U1 Control' : 'Kobra Control'" :tabs="tabs">
    <template #mark><span v-html="MARKS[plugin]" /></template>
    <template #status><OuiStatus :state="state ?? 'busy'">{{ stateLabel ?? t('Printing', 'Imprimindo') }}</OuiStatus></template>
    <template v-if="plugin === 'u1' && state !== 'offline'" #actions>
      <Button :label="t('Emergency stop', 'Parada de emergência')" severity="danger" size="small" data-test="estop"><template #icon><OuiIcon :icon="I.power" :size="14" /></template></Button>
    </template>
  </OuiAppBar>
</template>
