<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import { OuiAppBar, OuiIcon, OuiKeyValue, OuiPanel, OuiStatus } from '../../src/components';
import * as I from '../../src/icons';
import { t } from '../i18n';
import { MARKS } from '../marks';

// MOCK — Embedder: place a pocket (left), see it on the part (centre), review what will be applied (right).
defineProps<{ state: string }>();
const tab = ref('embed');
const tabs = [{ value: 'embed', label: t('Embed', 'Embutir'), icon: I.magnet }, { value: 'settings', label: t('Settings', 'Configurações'), icon: I.settings }];
const object = ref('Fridge tile'); const size = ref('Ø6 × 3 mm'); const mode = ref('embedded'); const rotation = ref(0); const cover = ref(1); const centre = ref(false);
const staged = [
  { id: 1, label: t('6×3 magnet', 'Ímã 6×3'), where: 'Fridge tile · ' + t('top · embedded', 'topo · embutido'), pause: 'Z 7.20 mm' },
  { id: 2, label: t('6×3 magnet', 'Ímã 6×3'), where: 'Fridge tile · ' + t('top · embedded', 'topo · embutido'), pause: 'Z 7.20 mm' },
];
</script>

<template>
  <OuiAppBar v-model="tab" name="Embedder" :tabs="tabs">
    <template #mark><span class="em-mark" v-html="MARKS.embedder" /></template>
    <template #status><OuiStatus state="ok">{{ t('Project loaded', 'Projeto carregado') }}</OuiStatus><span class="oui-truncate">Fridge tile · {{ t('plate 1 of 1 · 2 objects', 'placa 1 de 1 · 2 objetos') }}</span></template>
    <template #actions><Button :label="t('Load again', 'Carregar de novo')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.refresh" :size="14" /></template></Button></template>
  </OuiAppBar>

  <main class="oui-page em">
    <div class="em-grid">
      <OuiPanel class="em-form" :title="t('New pocket', 'Novo bolso')" :icon="I.insert">
        <div class="oui-stack">
          <div class="oui-field"><label for="em-object">{{ t('Object', 'Objeto') }}</label><Select v-model="object" input-id="em-object" :options="['Fridge tile', 'Badge']" fluid /></div>
          <div class="oui-field"><label for="em-size">{{ t('Insert', 'Inserto') }}</label>
            <Select v-model="size" input-id="em-size" :options="['Ø6 × 3 mm', 'Ø10 × 3 mm', 'Ø25 mm NFC', t('Custom size…', 'Tamanho personalizado…')]" fluid>
              <template #value="{ value }"><span class="em-opt"><span class="em-kind" :data-kind="String(value).includes('NFC') ? 'nfc' : 'magnet'" />{{ value }}</span></template>
              <template #option="{ option }"><span class="em-opt"><span class="em-kind" :data-kind="String(option).includes('NFC') ? 'nfc' : 'magnet'" />{{ option }}</span></template>
            </Select></div>
          <div class="oui-field"><span id="em-mode" class="em-label">{{ t('Pocket', 'Bolso') }}</span>
            <SelectButton v-model="mode" aria-labelledby="em-mode" :allow-empty="false" option-label="label" option-value="value" fluid
              :options="[{ value: 'embedded', label: t('Embedded', 'Embutido') }, { value: 'open', label: t('Open', 'Aberto') }]" /></div>
          <div class="em-two">
            <div class="oui-field"><label for="em-rot">{{ t('Rotation', 'Rotação') }}</label><InputNumber v-model="rotation" input-id="em-rot" suffix=" °" :min="0" :max="359" fluid /></div>
            <div class="oui-field"><label for="em-cover">{{ t('Cover', 'Cobertura') }}</label><InputNumber v-model="cover" input-id="em-cover" suffix=" mm" :min="0.2" :max-fraction-digits="1" :min-fraction-digits="1" fluid /></div>
          </div>
          <label class="em-check" for="em-centre"><Checkbox v-model="centre" binary input-id="em-centre" />{{ t('Centre on the face', 'Centralizar na face') }}</label>
        </div>
        <div class="em-plan">
          <p class="oui-label">{{ t('This pocket', 'Este bolso') }}</p>
          <OuiKeyValue :items="[{ label: t('Pocket size', 'Tamanho do bolso'), value: '6.40 × 6.40 × 3.20 mm' }, { label: t('Cavity', 'Cavidade'), value: 'Z 3.80 – 7.00 mm' },
            { label: t('Pause', 'Pausa'), value: 'Z 7.20 mm' }, { label: t('Cover', 'Cobertura'), value: '1.00 mm' }]" />
        </div>
        <template #footer><Button :label="t('Add pocket', 'Adicionar bolso')" severity="secondary" fluid data-test="add"><template #icon><OuiIcon :icon="I.plus" :size="14" /></template></Button></template>
      </OuiPanel>

      <OuiPanel class="em-view" title="Fridge tile" :icon="I.box" tone="sky" meta="60 × 40 × 8 mm" flush>
        <template #actions><Button :label="t('Fit view', 'Enquadrar')" severity="secondary" text size="small"><template #icon><OuiIcon :icon="I.target" :size="14" /></template></Button></template>
        <!-- The real page renders the part in 3D here. This drawing only marks the space the viewer takes. -->
        <div class="em-stage">
          <svg viewBox="0 0 600 400" role="img" :aria-label="t('Top face of Fridge tile with two pockets and one being placed', 'Face superior do Fridge tile com dois bolsos e um sendo posicionado')">
            <rect class="em-part" x="60" y="60" width="480" height="280" rx="18" />
            <g class="em-pocket"><circle cx="150" cy="130" r="26" /><circle cx="450" cy="130" r="26" /></g>
            <circle class="em-ghost" cx="300" cy="250" r="26" />
            <path class="em-cross" d="M300 214v72M264 250h72" />
          </svg>
          <p class="oui-meta em-hint">{{ t('Click a face to place the pocket.', 'Clique em uma face para posicionar o bolso.') }}</p>
        </div>
      </OuiPanel>

      <OuiPanel class="em-list" :title="t('Pockets to add', 'Bolsos a adicionar')" :icon="I.layers" tone="lime" flush :hint-label="t('About the pockets', 'Sobre os bolsos')"
        :hint="t('Each pocket is cut into a copy of the project. The print pauses at the height shown so you can put the insert in, then goes on and covers it.', 'Cada bolso é cortado em uma cópia do projeto. A impressão pausa na altura indicada para você colocar o inserto, depois continua e o cobre.')">
        <template #meta><span class="oui-chip oui-num">2</span></template>
        <ul class="em-rows">
          <li v-for="p in staged" :key="p.id">
            <span class="em-kind em-kind-lg" data-kind="magnet"><OuiIcon :icon="I.insert" :size="16" /></span>
            <div class="em-row-id"><p class="oui-strong">{{ p.label }}</p><p class="oui-meta">{{ p.where }} · {{ t('pause at', 'pausa em') }} <span class="oui-num">{{ p.pause }}</span></p></div>
            <Button severity="danger" text size="small" :aria-label="t(`Remove pocket ${p.id}`, `Remover bolso ${p.id}`)"><template #icon><OuiIcon :icon="I.trash" :size="14" /></template></Button>
          </li>
        </ul>
        <div class="em-ready">
          <p class="oui-label">{{ t('Have ready at the printer', 'Deixe à mão na impressora') }}</p>
          <p class="em-ready-line"><span class="em-kind" data-kind="magnet" /><strong class="oui-num">2 ×</strong> {{ t('6×3 magnet', 'ímã 6×3') }}</p>
          <p class="oui-label">{{ t('The print will pause', 'A impressão vai pausar') }}</p>
          <p class="em-ready-line oui-num"><OuiIcon :icon="I.pause" :size="14" /><strong>Z 7.20 mm</strong> {{ t('to insert 2 magnets', 'para inserir 2 ímãs') }}</p>
        </div>
        <template #footer>
          <span class="oui-meta">{{ t('2 pockets to add, 0 to remove. Writes a new copy.', '2 bolsos a adicionar, 0 a remover. Grava uma nova cópia.') }}</span>
          <Button :label="t('Apply', 'Aplicar')" class="em-apply" data-test="apply"><template #icon><OuiIcon :icon="I.check" :size="14" /></template></Button>
        </template>
      </OuiPanel>
    </div>
  </main>
</template>

<style>
/* Embedder's own brand colours for the two kinds of insert (embedder/assets/asset-manifest.json). */
.em { --em-magnet: #8c4b08; --em-nfc: #6541a6; }
.orca-dark .em { --em-magnet: #f2bc7a; --em-nfc: #c7b5ff; }
.em-mark .em-dot { fill: var(--oui-text); }
.em-grid { display: grid; gap: var(--oui-s3); grid-template-columns: minmax(0, 1fr); align-items: start; }
@container oui-page (min-width: 860px) { .em-grid { grid-template-columns: 320px minmax(0, 1fr); } .em-list { grid-column: 1 / -1; } }
@container oui-page (min-width: 1240px) { .em-grid { grid-template-columns: 320px minmax(0, 1fr) 380px; align-items: stretch; min-height: calc(100vh - 86px); } .em-list { grid-column: auto; } }
.em-label { font-size: var(--oui-text-sm); font-weight: 600; color: var(--oui-muted); }
.em-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--oui-s3); }
.em-check { display: flex; align-items: center; gap: var(--oui-s2); min-height: 24px; }
.em-opt { display: inline-flex; align-items: center; gap: var(--oui-s2); }
.em-kind { flex: none; display: inline-grid; place-items: center; width: 10px; height: 10px; border-radius: 50%; background: var(--em-magnet); }
.em-kind[data-kind='nfc'] { background: var(--em-nfc); border-radius: 2px; }
.em-kind-lg { width: 28px; height: 28px; border-radius: var(--oui-radius); color: var(--em-magnet); background: color-mix(in srgb, var(--em-magnet) 16%, transparent); }
.em-plan { display: grid; gap: var(--oui-s2); margin-top: var(--oui-s4); padding: var(--oui-s3) var(--oui-s4); border-radius: var(--oui-radius-lg); background: var(--oui-raised); box-shadow: inset 0 0 0 1px var(--oui-border); }
.em-plan dd { font-weight: 700; }
.em-stage { position: relative; display: grid; place-items: center; height: 100%; min-height: 320px; background: var(--oui-inset); border-radius: 0 0 var(--oui-radius-lg) var(--oui-radius-lg); }
.em-stage > svg { width: min(100%, 760px); height: auto; max-height: 100%; }
.em-part { fill: var(--oui-surface); stroke: var(--oui-sky); stroke-width: 2; }
.em-pocket > circle { fill: color-mix(in srgb, var(--em-magnet) 24%, transparent); stroke: var(--em-magnet); stroke-width: 2.5; }
.em-ghost { fill: none; stroke: var(--oui-primary-mark); stroke-width: 2.5; stroke-dasharray: 7 6; }
.em-cross { stroke: var(--oui-primary-mark); stroke-width: 1.5; fill: none; }
.em-hint { position: absolute; inset: auto 0 var(--oui-s3); text-align: center; }
.em-view .oui-panel-body { display: grid; }
.em-rows { list-style: none; padding: 0; }
.em-rows > li { display: flex; align-items: center; gap: var(--oui-s3); min-height: 52px; padding: var(--oui-s2) var(--oui-s2) var(--oui-s2) var(--oui-s4); border-bottom: 1px solid var(--oui-border); }
.em-row-id { flex: 1 1 0; display: grid; gap: 1px; min-width: 0; }
.em-ready { display: grid; gap: var(--oui-s1); padding: var(--oui-s4); }
.em-ready > .oui-label:not(:first-child) { margin-top: var(--oui-s3); }
.em-ready-line { display: flex; align-items: center; gap: var(--oui-s2); }
.em-ready-line > .oui-icon { color: var(--oui-muted); }
.em-list .oui-panel-foot { margin-top: auto; }
.em-apply { margin-inline-start: auto; }
</style>
