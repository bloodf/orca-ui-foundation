<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OuiPanel, OuiSpoolPick, OuiSwatch, type OuiColourGroup, type OuiSpoolPickLabels } from '../../src/components';
import { spool as spoolIcon } from '../../src/icons';
import { grams, t } from '../i18n';
import { makeSpools } from '../data';

// MOCK — 5.13: the colour-first spool picker over 2000 spools. state=dialog opens the dialog of the first colour with several.
// 5.14: every swatch has its name under it (the page gives the colour's word, `colourName`), and a line under the swatches.
// state=many: 40 colours, more than get a name each: swatches only, as before.
const props = defineProps<{ state: string }>();
const spools = props.state === 'many' ? makeSpools(2000).map((s, i) => (i < 5 ? s : { ...s, colour: '#' + ((i % 40) * 0x061309 + 0x202020).toString(16).padStart(6, '0').slice(0, 6) })) : makeSpools(2000);
// The colour's own word, as a plugin has it: here the part of the name after " - ".
const colourName = (g: OuiColourGroup) => (g.key ? g.spools[0].name?.split(' - ').pop() : undefined);
const picked = ref<number | null>(7);
const material = ref('');
const spool = computed(() => spools.find(s => s.id === picked.value) ?? null);
const labels: OuiSpoolPickLabels = {
  label: t('Spool for slot 2', 'Bobina do slot 2'), spools: t('{n} spools', '{n} bobinas'), noColour: t('No colour', 'Sem cor'),
  choose: t('Choose a spool', 'Escolha uma bobina'), unknown: '—', empty: t('No spools in stock.', 'Nenhuma bobina no estoque.'),
  search: t('Search brand, name, #id', 'Buscar marca, nome, #id'), noMatch: t('No spool matches.', 'Nenhuma bobina corresponde.'),
  allMaterials: t('All', 'Todos'), none: t('No spool', 'Sem bobina'), hint: t('Spools already in a slot are not listed.', 'Bobinas que já estão em um slot não aparecem.'),
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
        <OuiSpoolPick v-model:material="material" :spools="spools" :labels="labels" :selected="picked" :grams="grams" :colour-name="colourName" @pick="pick" />
      </div>
    </OuiPanel>
  </main>
</template>
