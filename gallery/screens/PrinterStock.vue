<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { OuiHint, OuiIcon, OuiLevel, OuiPageHeader, OuiPanel, OuiSpool, OuiStatus, OuiToolbar } from '../../src/components';
import * as I from '../../src/icons';
import { grams, param, t } from '../i18n';
import PrinterBar from '../v5/PrinterBar.vue';
import { SPOOLS, fraction, level, spool, type MockSpool } from '../v5/data';
// MOCK — the Stock tab U1 Control and Kobra Control share (5.0: stock left the dashboard). Left: where a spool can go
// (toolheads or ACE slots, with what is in them). Right: the Spoolman stock, with one action per row: link to the chosen place.
defineProps<{ state: string }>();
const plugin = param('screen', 'u1-stock').startsWith('kobra') ? 'kobra' : 'u1';
const targets = plugin === 'u1'
  ? [{ key: 'T1', tool: 1 as const, id: 9 }, { key: 'T2', tool: 2 as const, id: 44 }, { key: 'T3', tool: 3 as const, id: 35 }, { key: 'T4', tool: 4 as const, id: 28 }]
  : [{ key: '1', id: 42 }, { key: '2', id: 46 }, { key: '3', id: 26 }, { key: '4', id: null as number | null }];
const name = (key: string) => (plugin === 'u1' ? key : t('Slot ', 'Slot ') + key);
const target = ref(targets[0].key);
const loaded = (s: MockSpool) => targets.find(x => x.id === s.id)?.key;
const search = ref(''); const material = ref<string | null>(null); const same = ref(false);
const targetMaterial = computed(() => { const id = targets.find(x => x.key === target.value)?.id; return id ? spool(id).material : null; });
const rows = computed(() => SPOOLS.filter(s => (!material.value || s.material === material.value) && (!same.value || !targetMaterial.value || s.material === targetMaterial.value)
  && (!search.value || (s.name + s.vendor + s.location).toLowerCase().includes(search.value.toLowerCase()))));
</script>
<template>
  <PrinterBar :plugin="plugin" tab="stock" state="ok" :state-label="t('Connected', 'Conectada')" />
  <main class="oui-page" role="tabpanel" aria-labelledby="oui-tab-stock">
    <OuiPageHeader :title="t('Stock', 'Estoque')" :meta="t('57 spools · Spoolman through the printer · read 11 s ago', '57 bobinas · Spoolman pela impressora · lido há 11 s')">
      <template #actions>
        <OuiHint end :label="t('About the stock', 'Sobre o estoque')">{{ t('The stock is read from Spoolman. A link checks the spool and its filament there first; the printer records filament use by itself.', 'O estoque é lido do Spoolman. Um vínculo confere a bobina e o filamento lá primeiro; a impressora registra o consumo sozinha.') }}
          <a href="#">{{ t('Why are there two tabs (this one and Spooler)?', 'Por que há duas abas (esta e o Spooler)?') }}</a></OuiHint>
        <Button :label="t('Open Spooler', 'Abrir o Spooler')" severity="secondary" text><template #icon><OuiIcon :icon="I.external" :size="14" /></template></Button>
        <Button :label="t('Refresh', 'Atualizar')" severity="secondary"><template #icon><OuiIcon :icon="I.refresh" :size="14" /></template></Button>
      </template>
    </OuiPageHeader>

    <div class="oui-split" data-rail>
      <OuiPanel :title="t('Link to', 'Vincular a')" :icon="I.link" :hint-label="t('About linking', 'Sobre vincular')"
        :hint="t('Choose where the spool goes, then press Link on its row.', 'Escolha para onde a bobina vai e pressione Vincular na linha dela.')">
        <div class="ps-targets" role="radiogroup" :aria-label="t('Link target', 'Destino do vínculo')">
          <button v-for="x in targets" :key="x.key" type="button" role="radio" class="ps-target" :aria-checked="target === x.key" @click="target = x.key">
            <span class="oui-slot-badge oui-num" :data-tool="'tool' in x ? x.tool : undefined">{{ x.key }}</span>
            <OuiSpool :color="x.id ? spool(x.id).colour : null" :fraction="x.id ? fraction(spool(x.id)) : null" :size="32" />
            <span v-if="x.id" class="ps-target-id"><span class="oui-strong oui-truncate">{{ spool(x.id).name }}</span><span class="oui-meta oui-num oui-truncate">{{ spool(x.id).material }} · {{ grams(spool(x.id).remaining) }}</span></span>
            <span v-else class="ps-target-id oui-muted">{{ t('Empty', 'Vazio') }}</span>
          </button>
        </div>
      </OuiPanel>

      <OuiPanel flush class="ps-list">
        <OuiToolbar :summary="t(`${rows.length} of ${SPOOLS.length} spools`, `${rows.length} de ${SPOOLS.length} bobinas`)" :label="t('Filter spools', 'Filtrar bobinas')">
          <InputText v-model="search" size="small" :placeholder="t('Search name, vendor, location', 'Buscar nome, fabricante, local')" :aria-label="t('Search spools', 'Buscar bobinas')" />
          <Select v-model="material" size="small" :options="['PLA', 'PLA+', 'PETG', 'TPU', 'ASA']" show-clear :placeholder="t('All materials', 'Todos os materiais')" :aria-label="t('Material', 'Material')" />
          <label class="oui-row ps-same"><Checkbox v-model="same" binary input-id="ps-same" /><span>{{ t('Same material as ', 'Mesmo material de ') + name(target) }}</span></label>
        </OuiToolbar>
        <div class="ps-scroll">
          <DataTable :value="rows" size="small" data-key="id">
            <Column :header="t('Spool', 'Bobina')">
              <template #body="{ data }">
                <div class="ps-spool"><OuiSpool :color="data.colour" :fraction="fraction(data)" :size="36" />
                  <div class="ps-spool-id"><p class="oui-truncate" :title="data.name"><span class="oui-strong">{{ data.name }}</span> <span class="oui-muted oui-num">#{{ data.id }}</span></p>
                    <p class="oui-meta oui-truncate"><span v-if="data.useFirst" class="oui-chip">{{ t('use first', 'usar primeiro') }}</span> {{ data.vendor }}</p></div></div>
              </template>
            </Column>
            <Column :header="t('Material', 'Material')" style="width: 96px"><template #body="{ data }"><span class="oui-chip">{{ data.material }}</span></template></Column>
            <Column :header="t('Loaded in', 'Carregada em')" style="width: 128px">
              <template #body="{ data }"><span v-if="loaded(data)" class="oui-row ps-in"><span class="oui-slot-badge oui-num" :data-tool="plugin === 'u1' ? loaded(data)!.slice(1) : undefined">{{ loaded(data) }}</span></span><span v-else class="oui-muted">—</span></template>
            </Column>
            <Column :header="t('Left', 'Restante')" class="oui-num" style="width: 150px">
              <template #body="{ data }"><div class="ps-left"><strong>{{ data.remaining == null ? t('unknown', 'desconhecido') : grams(data.remaining) }}</strong><OuiLevel :fraction="fraction(data)" :tone="level(data)" /></div></template>
            </Column>
            <Column class="oui-end" style="width: 150px">
              <template #body="{ data }">
                <OuiStatus v-if="loaded(data) === target" state="ok">{{ t('Linked', 'Vinculada') }}</OuiStatus>
                <Button v-else :label="t('Link to ', 'Vincular a ') + name(target)" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.link" :size="13" /></template></Button>
              </template>
            </Column>
          </DataTable>
        </div>
      </OuiPanel>
    </div>
  </main>
</template>
<style>
.ps-targets { display: grid; gap: var(--oui-s1); }
.ps-target { display: flex; align-items: center; gap: var(--oui-s2); width: 100%; min-height: 48px; padding: 6px var(--oui-s2); border: 0; border-radius: var(--oui-radius); text-align: start; color: var(--oui-text); background: none; cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--oui-border); }
.ps-target:hover { background: var(--oui-raised); }
.ps-target[aria-checked='true'] { background: var(--oui-primary-soft); box-shadow: inset 0 0 0 2px var(--oui-primary-mark); }
.ps-target-id { display: grid; min-width: 0; }
.ps-list { max-height: calc(100vh - 124px); max-height: calc(100dvh - 124px); min-height: 320px; }
.ps-list > .oui-panel-body { display: flex; flex-direction: column; min-height: 0; }
.ps-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; border-top: 1px solid var(--oui-border); }
.ps-same { flex-wrap: nowrap; white-space: nowrap; cursor: pointer; }
.ps-spool { display: flex; align-items: center; gap: var(--oui-s3); min-width: 0; }
.ps-spool-id { display: grid; min-width: 0; }
.ps-left { display: grid; gap: 4px; justify-items: end; }
.ps-left > .oui-level { width: 100%; }
</style>
