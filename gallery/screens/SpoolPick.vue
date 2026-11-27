<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OuiPanel, OuiSpoolPick, OuiSwatch, type OuiSpoolPickLabels } from '../../src/components';
import { spool as spoolIcon } from '../../src/icons';
import { grams, t } from '../i18n';
import { makeSpools } from '../data';

// MOCK — 5.13: the colour-first spool picker over 2000 spools. state=dialog opens the dialog of the first colour with several.
const props = defineProps<{ state: string }>();
const spools = makeSpools(2000);
const picked = ref<number | null>(7);
const material = ref('');
const spool = computed(() => spools.find(s => s.id === picked.value) ?? null);
const labels: OuiSpoolPickLabels = {
  label: t('Spool for slot 2', 'Bobina do slot 2'), spools: t('{n} spools', '{n} bobinas'), noColour: t('No colour', 'Sem cor'),
  choose: t('Choose a spool', 'Escolha uma bobina'), unknown: '—', empty: t('No spools in stock.', 'Nenhuma bobina no estoque.'),
  search: t('Search brand, name, #id', 'Buscar marca, nome, #id'), noMatch: t('No spool matches.', 'Nenhuma bobina corresponde.'),
  allMaterials: t('All', 'Todos'), none: t('No spool', 'Sem bobina'),
};
const pick = (id: string | number | null) => { picked.value = id == null ? null : Number(id); };
onMounted(() => {
  if (props.state === 'dialog') document.querySelector<HTMLElement>('.oui-spick-c:has(.oui-spick-n)')?.click();
});
</script>
<template>
  <main class="oui-page" style="max-width: 520px">
    <OuiPanel :title="labels.label" :icon="spoolIcon">
      <div style="display: grid; gap: 12px; padding: 12px 16px">
        <p class="oui-meta" style="display: flex; align-items: center; gap: 6px; margin: 0" data-test="picked">
          <template v-if="spool"><OuiSwatch :color="spool.colour" :colors="spool.colours" />{{ spool.vendor }} {{ spool.name }} · #{{ spool.id }} · {{ grams(spool.remaining) }}</template>
          <template v-else>{{ labels.none }}</template>
        </p>
        <OuiSpoolPick v-model:material="material" :spools="spools" :labels="labels" :selected="picked" :grams="grams" @pick="pick" />
      </div>
    </OuiPanel>
  </main>
</template>
