<script setup lang="ts">
/*
 * A row of a list of things (staged pockets, saved presets): what it is on the left, its own actions (#actions: a
 * delete button) on the right, a hairline under it. Put the rows in <ul class="oui-list">.
 * `selectable` makes the row, but for its actions, one toggle button: pressed, the thing is the one in hand, and the row
 * shows it with a bar and a tint as well as aria-pressed. `update:selected` gives the new state; the page decides
 * whether pressing the chosen row lets go of it. The focus ring is drawn inside the row, which fills its list.
 */
defineProps<{ selectable?: boolean; selected?: boolean }>();
const emit = defineEmits<{ 'update:selected': [selected: boolean] }>();
</script>
<template>
  <li class="oui-listrow" :data-selected="selected || undefined">
    <button v-if="selectable" type="button" class="oui-listrow-main oui-listrow-pick" :aria-pressed="!!selected" @click="emit('update:selected', !selected)"><slot /></button>
    <div v-else class="oui-listrow-main"><slot /></div>
    <div v-if="$slots.actions" class="oui-listrow-actions"><slot name="actions" /></div>
  </li>
</template>
<style>
.oui-list { margin: 0; padding: 0; list-style: none; }
.oui-listrow { display: flex; align-items: stretch; gap: var(--oui-s2); min-height: 52px; padding-inline-end: var(--oui-s2); border-bottom: 1px solid var(--oui-border); }
.oui-list > .oui-listrow:last-child { border-bottom: 0; }
.oui-listrow-main { flex: 1 1 0; display: flex; align-items: center; gap: var(--oui-s3); min-width: 0; padding: var(--oui-s2) 0 var(--oui-s2) var(--oui-s4); }
.orca-ui .oui-listrow-pick { appearance: none; border: 0; background: none; font: inherit; color: inherit; text-align: start; cursor: pointer; }
.orca-ui .oui-listrow-pick:focus-visible { outline-offset: -2px; }
.oui-listrow-pick:hover { background: var(--oui-raised); }
.oui-listrow[data-selected] { background: var(--oui-primary-soft); box-shadow: inset 3px 0 0 var(--oui-primary-mark); }
.oui-listrow[data-selected] .oui-listrow-pick:hover { background: none; }
.oui-listrow-actions { flex: none; display: flex; align-items: center; gap: var(--oui-s1); }
</style>
