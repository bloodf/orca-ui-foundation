<script setup lang="ts">
import { defineComponent, h, onMounted, ref, type VNodeChild } from 'vue';
import Button from 'primevue/button';
import { OuiCamera, OuiDashboard, OuiIcon, OuiJob, OuiPageHeader, OuiPanel, OuiReadout, OuiSlot, OuiStatus, OuiWidgetMaximize, type OuiDashboardState, type OuiTone, type OuiWidget } from '../../src/components';
import * as I from '../../src/icons';
import { t } from '../i18n';
import PrinterBar from '../v5/PrinterBar.vue';
import { CAMERA, SPOOLS } from '../v5/data';

// MOCK — 5.14: OuiDashboard with widgets of very different heights. Outside edit mode every column packs on its own:
// the tall Filament card on the left does not stretch Temperatures, Controls or the camera beside it.
// state: '' | 'edit' (edit mode: the frame's bar names the widget, the module's header is blank) | 'settings' (a widget's
// settings, on the widget) | 'header' (the layout controls in the page header: editTo) | 'lost' (editTo names nothing
// on the page: the controls stay over the grid).
const props = defineProps<{ state: string }>();
const panel = (title: string, icon: I.OuiIconData, tone: OuiTone, body: () => VNodeChild, extra: Record<string, unknown> = {}) =>
  defineComponent(() => () => h(OuiPanel, { title, icon, tone, ...extra }, { default: body, actions: () => h(OuiWidgetMaximize) }), { props: ['config'] });
const slots = SPOOLS.slice(0, 7);
const widgets: OuiWidget[] = [
  { id: 'job', title: t('Print', 'Impressão'), icon: I.printer, w: 7, h: 3, minW: 4, minH: 2, narrowOrder: 1, component: defineComponent(() => () => h(OuiPanel, null, () =>
    h(OuiJob, { name: '1119-1113-obj_1_Arm_plate(01)_PLA_0.24.gcode', progress: 71, detail: t('Layer 377 of 544', 'Camada 377 de 544') }, {
      status: () => h(OuiStatus, { state: 'busy' }, () => t('Printing', 'Imprimindo')),
      default: () => [h(OuiReadout, { size: 'sm', label: t('Elapsed', 'Decorrido'), value: '5 h 25 min' }), h(OuiReadout, { size: 'sm', label: t('Left', 'Restante'), value: '2 h 19 min' })],
      actions: () => h(Button, { label: t('Pause', 'Pausar'), severity: 'secondary' }) }))) },
  { id: 'filament', title: t('Filament', 'Filamento'), icon: I.spool, w: 7, h: 8, minW: 4, minH: 4, narrowOrder: 2,
    component: panel(t('Filament', 'Filamento'), I.spool, 'magenta', () => h('div', { class: 'oui-cards', style: '--oui-cards-4: 9999px' },
      slots.map((s, i) => h(OuiSlot, { label: String(i + 1), name: i === 5 ? null : `${s.vendor} ${s.name}`, material: i === 5 ? null : s.material, color: s.colour, remaining: s.remaining, initial: s.initial, emptyLabel: t('Empty', 'Vazio'), active: i === 2 },
        { actions: () => h(Button, { label: i === 5 ? t('Assign spool', 'Escolher bobina') : t('Change', 'Trocar'), severity: 'secondary', size: 'small', text: true }) })))) },
  { id: 'temps', title: t('Temperatures', 'Temperaturas'), icon: I.thermometer, w: 2, h: 4, minW: 2, minH: 2, narrowOrder: 4,
    settings: [{ key: 'chamber', label: t('Chamber', 'Câmara'), default: true }, { key: 'fans', label: t('Fans', 'Ventoinhas'), default: false },
      { key: 'unit', label: t('Unit', 'Unidade'), default: 'c', options: [{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }] }],
    component: panel(t('Temperatures', 'Temperaturas'), I.thermometer, 'orange', () => h('div', { style: 'display: grid; gap: 12px' },
      [h(OuiReadout, { label: t('Nozzle', 'Bico'), value: '219.6', unit: '°C' }), h(OuiReadout, { label: t('Bed', 'Mesa'), value: '60.0', unit: '°C' })])) },
  { id: 'controls', title: t('Controls', 'Controles'), icon: I.settings, w: 3, h: 4, minW: 3, minH: 2, narrowOrder: 3,
    component: panel(t('Controls', 'Controles'), I.settings, 'neutral', () => h('div', { style: 'display: grid; gap: 8px' },
      [t('Fan 79 %', 'Ventoinha 79 %'), t('Speed: Standard', 'Velocidade: Padrão'), t('Light: off', 'Luz: desligada')].map(line => h('p', line)))) },
  { id: 'camera', title: t('Camera', 'Câmera'), icon: I.camera, w: 5, h: 9, minW: 3, minH: 4, fill: true, narrowOrder: 5,
    component: panel(t('Camera', 'Câmera'), I.camera, 'sky', () => h(OuiCamera, { src: CAMERA, alt: t('Printer camera', 'Câmera da impressora') }), { flush: true }) },
  { id: 'log', title: t('Activity', 'Atividade'), icon: I.terminal, text: t('What the printer was asked to do', 'O que foi pedido à impressora'), w: 5, h: 4, minW: 3, minH: 3, fill: true,
    component: panel(t('Activity', 'Atividade'), I.terminal, 'neutral', () => h('div', { class: 'oui-mono oui-meta', style: 'display: grid; gap: 4px' },
      ['01:50:22  Pause', '01:52:07  Resume', '02:14:40  Light on', '02:14:55  Light off'].map(line => h('span', line)))) },
];
const defaults = { name: t('Default', 'Padrão'), items: [
  { id: 'job', x: 0, y: 0, w: 7, h: 3 }, { id: 'filament', x: 0, y: 3, w: 7, h: 8 },
  { id: 'temps', x: 7, y: 0, w: 2, h: 4 }, { id: 'controls', x: 9, y: 0, w: 3, h: 4 }, { id: 'camera', x: 7, y: 4, w: 5, h: 9 }, { id: 'log', x: 7, y: 13, w: 5, h: 4 }] };
const stored = ref<OuiDashboardState>();
const dash = ref<InstanceType<typeof OuiDashboard>>();
onMounted(() => {
  if (props.state !== 'edit' && props.state !== 'settings') return;
  setTimeout(() => { dash.value?.edit(); if (props.state === 'settings') setTimeout(() => document.querySelector<HTMLElement>('[data-settings="temps"]')?.click(), 80); }, 200);
});
</script>
<template>
  <PrinterBar plugin="kobra" tab="dashboard" state="busy" />
  <main class="oui-page" role="tabpanel" aria-labelledby="oui-tab-dashboard">
    <OuiPageHeader title="Anycubic Kobra X" meta="192.168.1.50 · Firmware 2.0.2.8">
      <template #actions><span v-if="state === 'header'" id="dash-actions" /><Button :label="t('Rename', 'Renomear')" severity="secondary" text><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button></template>
    </OuiPageHeader>
    <OuiDashboard ref="dash" v-model="stored" :widgets="widgets" :defaults="defaults" :narrow-at="900" :edit-to="state === 'header' ? '#dash-actions' : state === 'lost' ? '#not-on-this-page' : undefined" />
  </main>
</template>
