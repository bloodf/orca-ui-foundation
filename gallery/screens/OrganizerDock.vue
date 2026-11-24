<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import { OuiAppBar, OuiBanner, OuiEmpty, OuiIcon, OuiJob, OuiKeyValue, OuiPanel, OuiStatus } from '../../src/components';
import * as I from '../../src/icons';
import { t } from '../i18n';
import { MARKS } from '../marks';
import plateArt from '../../assets/illustrations/organizer-plate.webp';

// MOCK — Organizer. A 280 x 360 dock beside the plate, or a tab. state: '' (ready) | 'running' | 'done'.
const props = defineProps<{ state: string }>();
const running = computed(() => props.state === 'running');
const done = computed(() => props.state === 'done');
const spacing = ref(2); const rotation = ref('auto'); const copies = ref<number | null>(null);
const file = 'Desk organizer-arranged-20261111-195500-1f3ffe.3mf';
const path = '/example/user/Library/Application Support/OrcaSlicer/plugins/storage/' + file;
</script>

<template>
  <OuiAppBar :name="t('Organizer', 'Organizador')">
    <template #mark><span v-html="MARKS.organizer" /></template>
    <template #status><span class="oui-truncate">{{ t('Plate 2 · 7 objects', 'Placa 2 · 7 objetos') }}</span></template>
  </OuiAppBar>

  <main class="oui-page od">
   <div class="od-grid" :data-state="state || 'ready'">
    <section class="od-form" :aria-label="t('Arrange', 'Arrumar')">
      <div class="oui-field">
        <label for="spacing">{{ t('Spacing between parts', 'Espaçamento entre peças') }}</label>
        <InputNumber v-model="spacing" input-id="spacing" suffix=" mm" :min="0" :max="50" :max-fraction-digits="1" show-buttons fluid :disabled="running" />
      </div>
      <div class="od-actions">
        <Button id="go" :label="t('Arrange plate 2', 'Arrumar placa 2')" :disabled="running"><template #icon><OuiIcon :icon="I.arrange" :size="14" /></template></Button>
        <Button id="fill" :label="t('Fill plate 2', 'Preencher placa 2')" severity="secondary" :disabled="running"><template #icon><OuiIcon :icon="I.fill" :size="14" /></template></Button>
      </div>
      <details class="od-adv">
        <summary id="adv"><OuiIcon :icon="I.chevronRight" :size="14" />{{ t('Advanced', 'Avançado') }}<span class="oui-meta">{{ t('rotation, copies', 'rotação, cópias') }}</span></summary>
        <div class="od-adv-body">
          <div class="oui-field"><label for="rotation">{{ t('Rotation', 'Rotação') }}</label>
            <Select v-model="rotation" input-id="rotation" size="small" option-label="label" option-value="value" fluid
              :options="[{ value: 'auto', label: t('Best fit', 'Melhor encaixe') }, { value: 'right', label: t('Right angles only', 'Só ângulos retos') }, { value: 'keep', label: t('Keep as is', 'Manter como está') }]" /></div>
          <div class="oui-field"><label for="copies">{{ t('Most copies when filling', 'Máximo de cópias ao preencher') }}</label>
            <InputNumber v-model="copies" input-id="copies" size="small" :min="1" :max="300" :placeholder="t('Fill the plate (up to 300)', 'Preencher a placa (até 300)')" fluid /></div>
        </div>
      </details>
      <p class="oui-meta od-note">{{ t('Saves a new file. Your project is not changed.', 'Salva um arquivo novo. Seu projeto não é alterado.') }}</p>
    </section>

    <section id="result" class="od-result" aria-live="polite">
      <div v-if="running" class="od-card">
        <OuiJob compact :name="'Desk organizer'" :progress="43" :count="t('7 of 14', '7 de 14')" :detail="t('Plate 2 · Tray copy 6', 'Placa 2 · Tray cópia 6')">
          <template #status><OuiStatus state="busy">{{ t('Placing parts', 'Posicionando peças') }}</OuiStatus></template>
          <template #actions><Button id="cancel" :label="t('Cancel', 'Cancelar')" severity="secondary" fluid><template #icon><OuiIcon :icon="I.x" :size="14" /></template></Button></template>
        </OuiJob>
      </div>

      <template v-else-if="done">
        <OuiBanner tone="success" :title="t('7 objects placed, 12 copies added.', '7 objetos posicionados, 12 cópias adicionadas.')" />
        <OuiBanner tone="warn" :title="t('2 objects did not fit:', '2 objetos não couberam:')">Phone stand, Cable clip</OuiBanner>
        <div class="od-saved">
          <p class="oui-label">{{ t('Saved copy', 'Cópia salva') }}</p>
          <p class="oui-mono oui-truncate od-path" :title="path">{{ file }}</p>
          <OuiKeyValue class="od-facts" :items="[{ label: 'Tray', value: t('8 copies', '8 cópias') }, { label: 'Pen cup', value: t('4 copies', '4 cópias') }, { label: t('Clearance', 'Folga'), value: '12.5 mm' }]" />
          <div class="od-saved-actions">
            <Button :label="t('Open copy in OrcaSlicer', 'Abrir cópia no OrcaSlicer')"><template #icon><OuiIcon :icon="I.external" :size="14" /></template></Button>
            <Button :label="t('Copy path', 'Copiar caminho')" severity="secondary" text size="small"><template #icon><OuiIcon :icon="I.copy" :size="14" /></template></Button>
          </div>
        </div>
      </template>

      <OuiPanel v-else class="od-idle" :title="t('Result', 'Resultado')" :icon="I.file" tone="neutral">
        <OuiEmpty :image="plateArt" :title="t('Nothing arranged yet', 'Nada arrumado ainda')" :text="t('Arrange packs the 7 objects of plate 2 by their real outline. Fill adds copies until the plate is full.', 'Arrumar encaixa os 7 objetos da placa 2 pelo contorno real. Preencher adiciona cópias até a placa encher.')" />
      </OuiPanel>
    </section>
   </div>
  </main>
</template>

<style>
.od { padding: var(--oui-s3); }
.od-grid { display: grid; gap: var(--oui-s3); align-items: start; }
.od-form { display: grid; gap: var(--oui-s3); align-content: start; }
.od-actions { display: grid; gap: var(--oui-s2); }
.od-actions > .p-button { min-height: 40px; font-size: 14px; }
.od-card { padding: var(--oui-s3); border-radius: var(--oui-radius-lg); background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-panel); overflow: hidden; }
.od-adv > summary { display: flex; align-items: center; gap: 6px; min-height: 28px; font-weight: 600; cursor: pointer; list-style: none; border-radius: var(--oui-radius); }
.od-adv > summary::-webkit-details-marker { display: none; }
.od-adv > summary > .oui-icon { color: var(--oui-muted); transition: transform var(--oui-fast); }
.od-adv[open] > summary > .oui-icon { transform: rotate(90deg); }
.od-adv-body { display: grid; gap: var(--oui-s3); padding-top: var(--oui-s2); }
.od-result { display: grid; gap: var(--oui-s2); align-content: start; min-width: 0; }
.od-saved { display: grid; gap: var(--oui-s2); padding: var(--oui-s3); border-radius: var(--oui-radius-lg); background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-panel); }
.od-saved-actions { display: grid; gap: var(--oui-s1); justify-items: stretch; }
.od-path { color: var(--oui-muted); }
/* The dock shows one thing at a time: the form, the running job or the result. A tab has room for both. */
@container oui-page (max-width: 620px) {
  .od-grid[data-state='running'] .od-form, .od-grid[data-state='done'] .od-form, .od-idle { display: none; }
  .od-facts { display: none; }
}
@container oui-page (min-width: 621px) {
  .od-saved-actions { display: flex; flex-wrap: wrap; }
  .od-grid { grid-template-columns: minmax(280px, 360px) minmax(0, 560px); gap: var(--oui-s4); }
  .od-form { padding: var(--oui-s4); border-radius: var(--oui-radius-lg); background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-panel); }
}
</style>
