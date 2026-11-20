<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { OuiAppBar, OuiBanner, OuiIcon, OuiPanel, OuiReadout, OuiStatus, OuiSwatch, OuiThumb } from '../../src/components';
import * as I from '../../src/icons';
import { t } from '../i18n';
import { MARKS } from '../marks';

// MOCK — Print Calculator. state: '' (complete quote) | 'missing' (a plate was not sliced: time and one weight unknown).
const props = defineProps<{ state: string }>();
const missing = computed(() => props.state === 'missing');
const tab = ref('calculator');
const tabs = [
  { value: 'calculator', label: t('Calculator', 'Calculadora'), icon: I.calculator },
  { value: 'quotes', label: t('Quotes', 'Orçamentos'), icon: I.receipt, count: 2 },
  { value: 'stock', label: t('Extras and stock', 'Extras e estoque'), icon: I.boxes },
  { value: 'settings', label: t('Settings', 'Ajustes'), icon: I.settings },
];
const U = t('unknown', 'desconhecido');
const plates = computed(() => (missing.value ? [
  { n: 1, time: null, grams: null, cost: 'R$ 14.25', partial: true, slots: [['PLA', '48 g', '#E8E8E8', 'Spooler'], ['PETG', null, '#2E6FBF', t('Filament #12', 'Filamento #12')]] },
] : [
  { n: 1, time: '2 h 14 min', grams: '129 g', cost: 'R$ 21.88', slots: [['PLA', '88 g', '#E8E8E8', 'Spooler'], ['PETG', '41 g', '#2E6FBF', t('Filament #12', 'Filamento #12')]] },
  { n: 2, time: '2 h 35 min', grams: '150 g', cost: 'R$ 23.41', slots: [['PLA', '150 g', '#E8E8E8', 'Spooler']] },
  { n: 3, time: '2 h 25 min', grams: '122 g', cost: 'R$ 21.37', slots: [['PLA', '80 g', '#E8E8E8', 'Spooler'], ['PETG', '42 g', '#2E6FBF', t('Filament #12', 'Filamento #12')]] },
]) as { n: number; time: string | null; grams: string | null; cost: string; partial?: boolean; slots: [string, string | null, string, string][] }[]);
const sections = computed(() => [
  { label: t('Machine and energy', 'Máquina e energia'), summary: missing.value ? t('Needs the print time', 'Precisa do tempo de impressão') : t('Energy R$ 0.82 · wear R$ 6.51 · failures R$ 2.26', 'Energia R$ 0,82 · desgaste R$ 6,51 · falhas R$ 2,26'), value: missing.value ? null : 'R$ 9.59', icon: I.zap, tone: 'orange' as const },
  { label: t('Labor', 'Mão de obra'), summary: '10 min · R$ 30.00 / h', value: 'R$ 5.00', icon: I.hand, tone: 'sky' as const },
  { label: t('Extras and accessories', 'Extras e acessórios'), summary: t('None', 'Nenhum'), value: 'R$ 0.00', icon: I.parcel, tone: 'violet' as const },
  { label: t('Shipping', 'Frete'), summary: t('Not included', 'Não incluído'), value: 'R$ 0.00', icon: I.truck, tone: 'cobalt' as const },
  { label: t('Sales fee', 'Taxa de venda'), summary: t('Online store · 5 % + R$ 1.00 · tax 6 %', 'Loja online · 5 % + R$ 1,00 · imposto 6 %'), value: missing.value ? 'R$ 3.64' : 'R$ 11.14', icon: I.store, tone: 'teal' as const },
]);
const breakdown = computed(() => (missing.value ? [
  [t('Filament', 'Filamento'), 'R$ 8.79', 62, t('partial', 'parcial')], [t('Energy', 'Energia'), null, 0, t('time unknown', 'tempo desconhecido')],
  [t('Printer wear', 'Desgaste da impressora'), null, 0, t('time unknown', 'tempo desconhecido')], [t('Failures', 'Falhas'), 'R$ 0.46', 3, ''], [t('Labor', 'Mão de obra'), 'R$ 5.00', 35, ''],
] : [
  [t('Filament', 'Filamento'), 'R$ 42.06', 45.7, ''], [t('Energy', 'Energia'), 'R$ 0.82', 0.9, ''], [t('Printer wear', 'Desgaste da impressora'), 'R$ 6.51', 7.1, ''],
  [t('Failures', 'Falhas'), 'R$ 2.26', 2.5, ''], [t('Labor', 'Mão de obra'), 'R$ 5.00', 5.4, ''], [t('Channel fees', 'Taxas do canal'), 'R$ 5.61', 6.1, ''], [t('Tax', 'Imposto'), 'R$ 5.53', 6, ''],
]) as [string, string | null, number, string][]);
const pieces = ref(10); const markup = ref(42.86); const copies = ref(1); const customer = ref('Ana Souza'); const channel = ref('store');
const why = 'cq-why';
const TONES = ['magenta', 'orange', 'cobalt', 'violet', 'sky', 'teal', 'neutral'] as const;
</script>

<template>
  <OuiAppBar v-model="tab" name="Print Calculator" :tabs="tabs">
    <template #mark><span v-html="MARKS.calculator" /></template>
    <template #status>
      <span class="oui-truncate"><strong class="cq-project">{{ missing ? 'Gridfinity bins' : 'Desk organizer' }}</strong> · {{ missing ? 'Bambu Lab X1 Carbon · 120 W' : 'Snapmaker U1 · 120 W' }}</span>
      <OuiStatus v-if="missing" state="warn">{{ t('Power estimated', 'Potência estimada') }}</OuiStatus>
    </template>
    <template #actions>
      <Button :label="t('Import sliced file', 'Importar arquivo fatiado')" severity="secondary" text size="small" />
      <Button :label="t('Refresh', 'Atualizar')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.refresh" :size="14" /></template></Button>
    </template>
  </OuiAppBar>

  <main class="oui-page cq">
    <OuiBanner v-if="missing" :id="why" tone="warn" :title="t('This quote is incomplete: 2 items are missing.', 'Este orçamento está incompleto: faltam 2 itens.')">
      {{ t('Slice the project again in OrcaSlicer, then refresh. Until then the price is partial and cannot be saved or sent.', 'Fatie o projeto de novo no OrcaSlicer e atualize. Até lá o preço é parcial e não pode ser salvo nem enviado.') }}
      <template #actions><Button :label="t('Refresh', 'Atualizar')" severity="secondary" size="small" /></template>
    </OuiBanner>

    <div class="cq-grid">
     <div class="cq-left">
      <OuiPanel class="cq-plates" :title="t('Plates', 'Placas')" :icon="I.plate" tone="cobalt" flush
        :meta="missing ? t('1 plate · time unknown', '1 placa · tempo desconhecido') : t('3 plates · 7 h 14 min · 401 g', '3 placas · 7 h 14 min · 401 g')">
        <ul class="cq-list">
          <li v-for="p in plates" :key="p.n" class="cq-plate">
            <OuiIcon :icon="I.plate" :size="22" tile tone="cobalt" />
            <div class="cq-plate-id">
              <p class="oui-strong">{{ t('Plate', 'Placa') }} {{ p.n }}</p>
              <p class="oui-meta oui-num"><span :class="{ 'cq-gap': !p.time }">{{ p.time ?? t('time unknown', 'tempo desconhecido') }}</span> · <span :class="{ 'cq-gap': !p.grams }">{{ p.grams ?? t('weight unknown', 'peso desconhecido') }}</span></p>
            </div>
            <ul class="cq-fils">
              <li v-for="(s, i) in p.slots" :key="i" :title="s[3]"><OuiSwatch :color="s[2]" /><span class="oui-strong">{{ s[0] }}</span>
                <span class="oui-num" :class="s[1] ? 'oui-muted' : 'cq-gap'">{{ s[1] ?? U }}</span></li>
            </ul>
            <div class="cq-plate-cost oui-num"><strong>{{ p.cost }}</strong><span v-if="p.partial" class="oui-chip" data-tone="warn">{{ t('partial', 'parcial') }}</span></div>
          </li>
        </ul>
        <template #footer>
          <label class="cq-inline" for="cq-copies">{{ t('Copies per run', 'Cópias por rodada') }}<InputNumber v-model="copies" input-id="cq-copies" :min="1" size="small" :input-style="{ width: '56px' }" /></label>
          <span class="oui-meta">{{ t('One run of these plates makes 1 piece.', 'Uma rodada destas placas rende 1 peça.') }}</span>
        </template>
      </OuiPanel>

      <OuiPanel class="cq-costs" :title="t('Costs', 'Custos')" :icon="I.coins" tone="orange" flush :meta="t('per piece', 'por peça')">
        <ul class="cq-list">
          <li v-for="s in sections" :key="s.label">
            <button type="button" class="cq-sec" aria-expanded="false">
              <OuiIcon :icon="s.icon" :size="16" tile :tone="s.tone" />
              <span class="cq-sec-id"><span class="oui-strong">{{ s.label }}</span><span class="oui-meta oui-truncate">{{ s.summary }}</span></span>
              <span class="oui-num" :class="s.value ? 'oui-strong' : 'cq-gap'">{{ s.value ?? '—' }}</span>
              <OuiIcon :icon="I.chevronRight" :size="14" class="cq-sec-icon" />
            </button>
          </li>
        </ul>
        <template #footer>
          <span class="oui-strong">{{ t('Cost per piece', 'Custo por peça') }}</span><span v-if="missing" class="oui-chip" data-tone="warn">{{ t('partial', 'parcial') }}</span>
          <span class="oui-spacer" /><span class="oui-num cq-sum">{{ missing ? 'R$ 14.25' : 'R$ 56.65' }}</span>
        </template>
      </OuiPanel>

     </div>
      <OuiPanel class="cq-price" :title="t('Price', 'Preço')" :icon="I.tag" tone="lime">
        <template v-if="missing" #meta><OuiStatus state="warn">{{ t('Incomplete', 'Incompleto') }}</OuiStatus></template>
        <div class="oui-hero" :data-tone="missing ? 'warn' : undefined">
        <OuiReadout class="cq-hero" size="hero" :label="t('Suggested price · per piece', 'Preço sugerido · por peça')" :value="missing ? 'R$ 24.00' : 'R$ 92.10'" :incomplete="missing"
          :sub="missing ? t('Partial: built without the print time and one filament weight.', 'Parcial: calculado sem o tempo de impressão e sem o peso de um filamento.') : t('Rounded up from R$ 92.06', 'Arredondado para cima de R$ 92,06')" />
        <div class="cq-figures">
          <OuiReadout :label="t('Profit per piece', 'Lucro por peça')" :value="missing ? 'R$ 6.11' : 'R$ 24.31'" :incomplete="missing" />
          <OuiReadout :label="t('Margin', 'Margem')" :value="missing ? '25.5 %' : '26.4 %'" :incomplete="missing" />
          <OuiReadout :label="t('Break-even', 'Empate em')" :value="missing ? 'R$ 17.14' : 'R$ 64.78'" :incomplete="missing" />
        </div>
        </div>
        <div class="cq-fields">
          <div class="oui-field"><label for="cq-channel">{{ t('Sales channel', 'Canal de venda') }}</label>
            <Select v-model="channel" input-id="cq-channel" option-label="label" option-value="value" :options="[{ value: 'store', label: t('Online store', 'Loja online') }, { value: 'direct', label: t('Direct sale', 'Venda direta') }]" /></div>
          <div class="oui-field"><label for="cq-pieces">{{ t('Pieces ordered', 'Peças pedidas') }}</label><InputNumber v-model="pieces" input-id="cq-pieces" :min="1" fluid /></div>
          <div class="oui-field"><label for="cq-markup">{{ t('Markup', 'Margem sobre o custo') }}</label><InputNumber v-model="markup" input-id="cq-markup" suffix=" %" :max-fraction-digits="2" fluid /></div>
          <div class="oui-field"><label for="cq-customer">{{ t('Customer', 'Cliente') }}</label><InputText id="cq-customer" v-model="customer" fluid /></div>
        </div>
        <h3 class="oui-label cq-h">{{ t('Where the price goes', 'Para onde vai o preço') }}</h3>
        <div class="cq-stack" aria-hidden="true"><span v-for="(b, i) in breakdown" :key="b[0]" :data-tone="TONES[i % TONES.length]" :style="{ flexGrow: b[2] }" /><span v-if="!missing" data-tone="lime" :style="{ flexGrow: 26.4 }" /></div>
        <ul class="cq-break">
          <li v-for="(b, i) in breakdown" :key="b[0]">
            <span class="cq-key" :data-tone="TONES[i % TONES.length]" aria-hidden="true" />
            <span>{{ b[0] }} <span v-if="b[3]" class="oui-chip" data-tone="warn">{{ b[3] }}</span></span>
            <span class="oui-num oui-muted">{{ b[1] ? b[2] + ' %' : '' }}</span>
            <span class="oui-num" :class="b[1] ? '' : 'cq-gap'">{{ b[1] ?? '—' }}</span>
          </li>
          <li v-if="!missing"><span class="cq-key" data-tone="lime" aria-hidden="true" /><span class="oui-strong">{{ t('Profit', 'Lucro') }}</span><span class="oui-num oui-muted">26.4 %</span><span class="oui-num oui-strong">R$ 24.31</span></li>
        </ul>
        <template #footer>
          <Button :label="t('Save quote', 'Salvar orçamento')" :disabled="missing" :aria-describedby="missing ? why : undefined"><template #icon><OuiIcon :icon="I.save" :size="14" /></template></Button>
          <Button :label="t('Print quote', 'Imprimir orçamento')" severity="secondary" :disabled="missing" :aria-describedby="missing ? why : undefined" />
          <Button label="CSV" severity="secondary" text :disabled="missing" :aria-describedby="missing ? why : undefined"><template #icon><OuiIcon :icon="I.download" :size="14" /></template></Button>
          <span v-if="!missing" class="oui-meta cq-total oui-num">{{ t('10 pieces · R$ 921.00', '10 peças · R$ 921,00') }}</span>
        </template>
      </OuiPanel>
    </div>
  </main>
</template>

<style>
.cq-project { color: var(--oui-text); font-weight: 600; }
.cq-grid { display: grid; gap: var(--oui-s3); grid-template-columns: minmax(0, 1fr); align-items: start; }
.cq-left { display: grid; gap: var(--oui-s3); grid-template-columns: minmax(0, 1fr); align-items: start; min-width: 0; }
@container oui-page (min-width: 900px) { .cq-grid { grid-template-columns: minmax(0, 1fr) minmax(380px, 440px); } .cq-price { position: sticky; top: 64px; } }
@container oui-page (min-width: 1500px) { .cq-grid { grid-template-columns: minmax(0, 1fr) 460px; } .cq-left { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.cq-list { list-style: none; padding: 0; }
.cq-list > li + li { border-top: 1px solid var(--oui-border); }
.cq-plate { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2) var(--oui-s3); padding: var(--oui-s3) var(--oui-s4); }
.cq-plate-id { flex: 1 1 130px; display: grid; gap: 1px; min-width: 0; }
.cq-fils { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--oui-s1) var(--oui-s4); }
.cq-fils > li { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.cq-plate-cost { display: grid; justify-items: end; gap: 2px; min-width: 76px; margin-inline-start: auto; text-align: end; }
.cq-gap { color: var(--oui-warning); font-weight: 600; }
.cq-inline { display: inline-flex; align-items: center; gap: var(--oui-s2); font-weight: 600; white-space: nowrap; }
.cq-sec { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: var(--oui-s3); width: 100%; min-height: 52px; padding: var(--oui-s2) var(--oui-s4);
  border: 0; background: none; color: inherit; text-align: start; cursor: pointer; transition: background var(--oui-fast); }
.cq-sec:hover { background: var(--oui-raised); }
.orca-ui .cq-sec:focus-visible { outline-offset: -2px; }
.cq-sec-id { display: grid; gap: 1px; min-width: 0; }
.cq-sec-icon { color: var(--oui-muted); }
.cq-plate > .oui-tile { border-radius: var(--oui-radius-lg); }
.cq-sum { font-size: var(--oui-text-lg); font-weight: 650; }
.cq-figures { display: flex; flex-wrap: wrap; gap: var(--oui-s3) var(--oui-s6); padding-top: var(--oui-s3); border-top: 1px solid var(--oui-border); }
.cq-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--oui-s3); margin-top: var(--oui-s5); }
.cq-h { margin-block: var(--oui-s5) var(--oui-s2); }
.cq-break { list-style: none; padding: 0; display: grid; gap: 6px; }
.cq-break > li { display: grid; grid-template-columns: 10px minmax(0, 1fr) 52px 72px; align-items: center; gap: var(--oui-s2); }
.cq-break > li > :nth-last-child(-n + 2) { text-align: end; }
.cq-key { width: 10px; height: 10px; border-radius: 3px; background: var(--oui-tone); }
.cq-stack { display: flex; gap: 2px; height: 10px; margin-bottom: var(--oui-s3); }
.cq-stack > span { flex: 0 1 0; min-width: 3px; border-radius: 3px; background: var(--oui-tone); }
.cq-hero .oui-readout-value { font-size: 48px; }
.cq-total { margin-inline-start: auto; }
</style>
