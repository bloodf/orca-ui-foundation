<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { OuiAppBar, OuiIcon, OuiKeyValue, OuiLevel, OuiPageHeader, OuiPanel, OuiSpool, OuiStatus, OuiSwatch, OuiToolbar } from '../../src/components';
import * as I from '../../src/icons';
import { grams, lang, t } from '../i18n';
import { MARKS } from '../marks';
import { SPOOLS, fraction, level } from '../v5/data';
// MOCK — Spooler, Spools page, 5.0: the spool pictures carry the colour; the cards, the page and the bar are neutral.
defineProps<{ state: string }>();
const tab = ref('spools');
// Spooler's real tabs: Spools, Printer, Stats, Settings.
const tabs = [{ value: 'spools', label: t('Spools', 'Bobinas'), icon: I.spool, count: SPOOLS.length }, { value: 'printer', label: t('Printer', 'Impressora'), icon: I.printer },
  { value: 'stats', label: t('Stats', 'Estatísticas'), icon: I.chart }, { value: 'settings', label: t('Settings', 'Ajustes'), icon: I.settings }];
const search = ref(''); const material = ref<string | null>(null); const location = ref<string | null>(null);
const rows = computed(() => SPOOLS.filter(s => (!material.value || s.material === material.value) && (!search.value || (s.name + s.vendor).toLowerCase().includes(search.value.toLowerCase()))));
const selectedId = ref(12);
const selected = computed(() => SPOOLS.find(s => s.id === selectedId.value) ?? SPOOLS[0]);
const useFirst = ref(true);
const LOADED: Record<number, string> = { 9: 'U1 · T1', 44: 'U1 · T2', 35: 'U1 · T3', 28: 'U1 · T4', 42: 'Kobra · 1', 46: 'Kobra · 2', 26: 'Kobra · 3' };
const total = (SPOOLS.reduce((sum, s) => sum + (s.remaining ?? 0), 0) / 1000).toLocaleString(lang, { maximumFractionDigits: 1 });
</script>
<template>
  <OuiAppBar v-model="tab" name="Spooler" :tabs="tabs">
    <template #mark><span v-html="MARKS.spooler" /></template>
    <template #status><OuiStatus state="ok">Spoolman</OuiStatus><span class="oui-truncate">192.168.1.10:7912 · {{ t('read 34 s ago', 'lido há 34 s') }}</span></template>
  </OuiAppBar>
  <main class="oui-page" role="tabpanel" aria-labelledby="oui-tab-spools">
    <OuiPageHeader :title="t('Spools', 'Bobinas')" :meta="t(`${SPOOLS.length} spools · ${total} kg left · 3 low`, `${SPOOLS.length} bobinas · ${total} kg restantes · 3 baixas`)">
      <template #actions>
        <Button :label="t('Sync presets', 'Sincronizar perfis')" severity="secondary"><template #icon><OuiIcon :icon="I.refresh" :size="14" /></template></Button>
        <Button :label="t('Add spool', 'Adicionar bobina')"><template #icon><OuiIcon :icon="I.plus" :size="14" /></template></Button>
      </template>
    </OuiPageHeader>
    <div class="oui-split" data-detail>
      <OuiPanel flush>
        <OuiToolbar :summary="t(`${rows.length} shown`, `${rows.length} exibidas`)" :label="t('Filter spools', 'Filtrar bobinas')">
          <InputText v-model="search" size="small" :placeholder="t('Search name or vendor', 'Buscar nome ou fabricante')" :aria-label="t('Search spools', 'Buscar bobinas')" />
          <Select v-model="material" size="small" :options="['PLA', 'PLA+', 'PETG', 'TPU', 'ASA']" show-clear :placeholder="t('All materials', 'Todos os materiais')" :aria-label="t('Material', 'Material')" />
          <Select v-model="location" size="small" :options="['Shelf A', 'Dry box']" show-clear :placeholder="t('All locations', 'Todos os locais')" :aria-label="t('Location', 'Local')" />
        </OuiToolbar>
        <div class="ss-cards" role="listbox" :aria-label="t('Spools', 'Bobinas')">
          <button v-for="s in rows" :key="s.id" type="button" role="option" class="ss-card" :aria-selected="s.id === selectedId" @click="selectedId = s.id">
            <OuiSpool :color="s.colour" :fraction="fraction(s)" :size="64" />
            <span class="ss-card-id">
              <span class="oui-strong ss-card-name">{{ s.name }}</span>
              <span class="oui-meta oui-truncate">{{ s.vendor }} · {{ s.material }} · #{{ s.id }}</span>
              <span class="ss-card-left oui-num"><strong>{{ s.remaining == null ? t('unknown', 'desconhecido') : grams(s.remaining) }}</strong><OuiLevel :fraction="fraction(s)" :tone="level(s)" /></span>
              <span class="oui-row ss-card-tags">
                <OuiStatus v-if="level(s) === 'critical'" state="error">{{ t('Almost empty', 'Quase vazia') }}</OuiStatus><OuiStatus v-else-if="level(s) === 'low'" state="warn">{{ t('Low', 'Baixa') }}</OuiStatus>
                <span v-if="LOADED[s.id]" class="oui-chip">{{ LOADED[s.id] }}</span><span v-if="s.useFirst" class="oui-chip">{{ t('use first', 'usar primeiro') }}</span>
              </span>
            </span>
          </button>
        </div>
      </OuiPanel>

      <OuiPanel :title="t('Spool', 'Bobina') + ' #' + selected.id" :icon="I.spool" tone="magenta">
        <template #actions><Button severity="secondary" text size="small" :aria-label="t('Open in Spoolman', 'Abrir no Spoolman')"><template #icon><OuiIcon :icon="I.external" :size="14" /></template></Button></template>
        <div class="oui-stack">
          <div class="ss-well"><OuiSpool :color="selected.colour" :fraction="fraction(selected)" :size="128" /></div>
          <div>
            <h3 class="ss-name">{{ selected.name }}</h3>
            <p class="oui-meta oui-row"><OuiSwatch :color="selected.colour" />{{ selected.vendor }} · {{ selected.material }} · <span class="oui-mono">{{ selected.colour }}</span></p>
          </div>
          <div class="ss-amount">
            <p class="oui-num"><strong class="ss-figure">{{ selected.remaining == null ? '—' : Math.round(selected.remaining).toLocaleString(lang) }}</strong> g <span class="oui-muted">{{ t('of', 'de') }} {{ selected.initial.toLocaleString(lang) }} g</span></p>
            <OuiLevel :fraction="fraction(selected)" :tone="level(selected)" />
          </div>
          <OuiKeyValue :items="[{ label: t('Location', 'Local'), value: selected.location || t('Shelf A', 'Prateleira A') }, { label: t('Loaded in', 'Carregada em'), value: LOADED[selected.id] },
            { label: t('Lasts about', 'Dura cerca de'), value: t('2.5 weeks', '2,5 semanas') }, { label: t('Price', 'Preço'), value: 'R$ 89,90' }, { label: t('Last used', 'Último uso'), value: t('Nov 12', '12 nov') }]" />
          <label class="oui-row ss-first"><span class="oui-strong">{{ t('Use this spool first', 'Usar esta bobina primeiro') }}</span><span class="oui-spacer" /><ToggleSwitch v-model="useFirst" /></label>
          <div class="oui-row">
            <Button :label="t('Edit', 'Editar')" severity="secondary"><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button>
            <Button :label="t('Weigh', 'Pesar')" severity="secondary"><template #icon><OuiIcon :icon="I.scale" :size="14" /></template></Button>
            <span class="oui-spacer" />
            <Button :label="t('Archive', 'Arquivar')" severity="danger" outlined><template #icon><OuiIcon :icon="I.archive" :size="14" /></template></Button>
          </div>
        </div>
      </OuiPanel>
    </div>
  </main>
</template>
<style>
.ss-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: var(--oui-s2); padding: var(--oui-s3); border-top: 1px solid var(--oui-border); }
.ss-card { display: flex; align-items: flex-start; gap: var(--oui-s3); min-width: 0; padding: var(--oui-s3); border: 0; border-radius: var(--oui-radius-lg); text-align: start; color: var(--oui-text); background: var(--oui-raised); cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--oui-border); }
.ss-card:hover { box-shadow: inset 0 0 0 1px var(--oui-control-border); }
.ss-card[aria-selected='true'] { box-shadow: inset 0 0 0 2px var(--oui-primary-mark); }
.ss-card-id { flex: 1 1 0; display: grid; gap: 3px; min-width: 0; }
.ss-card-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; }
.ss-card-left { display: grid; gap: 4px; margin-top: 2px; }
.ss-card-tags:empty { display: none; }
.ss-card-tags { gap: var(--oui-s1); margin-top: 2px; }
.ss-well { display: grid; place-items: center; padding: var(--oui-s4); border-radius: var(--oui-radius); background: var(--oui-inset); }
.orca-ui .ss-name { font-size: var(--oui-text-lg); font-weight: 700; }
.ss-amount { display: grid; gap: 6px; }
.ss-figure { font-size: var(--oui-text-2xl); font-weight: 700; letter-spacing: -.015em; }
.ss-first { padding: var(--oui-s2) 0; border-block: 1px solid var(--oui-border); cursor: pointer; }
</style>
