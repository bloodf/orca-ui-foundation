<script setup lang="ts" generic="T extends OuiPickSpool">
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import OuiLevel from './OuiLevel.vue';
import OuiSwatch from './OuiSwatch.vue';
import { fuzzyFilter } from './fuzzy';
import { groupByColour, materialsOf, type OuiColourGroup, type OuiPickSpool } from './spoolPick';

/*
 * Pick a spool colour first. The picker draws one swatch per colour (spoolPick.ts groups them), with a count when more
 * than one spool has it, so what is drawn grows with the colours on the shelf, not the spools: a CSS circle each, no spool
 * render. Each swatch has its name under it (two blacks or three whites cannot be told apart by a dot): the colour's name
 * from `colourName` when the page has one ("Black"), else the name of its fullest spool. Past NAMED_MAX colours the grid
 * is swatches only, with the name as the tooltip, so a big shelf still fits; a search or a material brings the names back.
 * A colour's raw key (its hex) is never shown or read out. A colour with one spool picks it at once; with more, a dialog lists only that colour's spools, fullest first, with
 * the grams and a fill bar, and one is chosen there. `pick` comes after the dialog has closed and focus is back on the
 * swatch, so a confirmation the page opens next returns focus there too.
 * Optional parts appear when their label is given: the search (`labels.search`: brand, name, material, location
 * fuzzy; a number or #number is a spool id, exactly), the material filter (`labels.allMaterials`, with two or more
 * materials; v-model:material, '' is all) and a "no spool" choice first (`labels.none`, emits `pick` with null).
 * Keyboard: the swatches are one tab stop; arrows move (Up/Down by a row), Home/End, Enter/Space choose, Escape emits
 * `close`. In the search, Down goes to the swatches and Enter chooses the first colour. In the dialog, Up/Down move through
 * the spools, Escape returns to the swatch.
 */
export interface OuiSpoolPickLabels {
  /** The picker's accessible name ("Spool for slot 2"). */ label: string;
  /** '{n} spools' (on a swatch with several and as the dialog's subtitle). */ spools: string;
  /** The swatch of spools with no colour. */ noColour: string;
  /** The dialog title ("Choose a spool"). */ choose: string;
  /** Weight not known. */ unknown: string;
  /** Nothing to pick. */ empty: string;
  search?: string; /** The search found nothing. */ noMatch?: string;
  /** The material filter's "every material" chip. */ allMaterials?: string;
  /** The "no spool" choice (unlink). */ none?: string;
  /** One line under the swatches ("Spools already in a slot aren't listed."). */ hint?: string;
}
/** Up to this many colours every swatch has its name under it; with more, the grid is swatches only. */
const NAMED_MAX = 24;
type Id = OuiPickSpool['id'];
const props = defineProps<{ spools: T[]; labels: OuiSpoolPickLabels; /** The spool picked now: its colour is marked. */ selected?: Id | null;
  /** Grams as text; default whole grams in the page language ("1,234 g"). */ grams?: (g: number) => string;
  /** The colour's name in the page language ("Black", "Dark green"), for the swatch's caption, tooltip and the dialog. Default: the name of its fullest spool. */
  colourName?: (group: OuiColourGroup<T>) => string | null | undefined }>();
const emit = defineEmits<{ pick: [id: Id | null, spool: T | null]; close: [] }>();
const material = defineModel<string>('material', { default: '' });

const query = ref('');
const materials = computed(() => (props.labels.allMaterials ? materialsOf(props.spools) : []));
const shown = computed(() => {
  const m = materials.value.length > 1 && materials.value.includes(material.value) ? material.value : '';
  const inMaterial = m ? props.spools.filter(s => (s.material ?? '').trim() === m) : props.spools;
  const q = query.value.trim(), id = /^#?(\d+)$/.exec(q);
  if (!q) return inMaterial;
  if (id) return inMaterial.filter(s => String(s.id) === id[1]);
  return fuzzyFilter(inMaterial, q, s => [s.vendor, s.name, s.material, s.location].filter(Boolean).join(' ')).map(r => r.item);
});
const groups = computed(() => groupByColour(shown.value));
const selectedKey = computed(() => (props.selected == null ? null : groups.value.find(g => g.spools.some(s => s.id === props.selected))?.key ?? null));

const count = (n: number) => props.labels.spools.replace('{n}', String(n));
const lead = (g: OuiColourGroup<T>) => g.spools[0];
const nameOf = (g: OuiColourGroup<T>) => props.colourName?.(g) || (g.key ? lead(g).name || lead(g).material || `#${lead(g).id}` : props.labels.noColour);
const groupLabel = (g: OuiColourGroup<T>) => (g.spools.length > 1 ? `${nameOf(g)} · ${count(g.spools.length)}` : nameOf(g));
const named = computed(() => groups.value.length <= NAMED_MAX);
const gramsText = (g: number | null | undefined) => (typeof g !== 'number' ? props.labels.unknown
  : props.grams ? props.grams(g) : `${Math.round(g).toLocaleString(document.documentElement.lang || undefined)} g`);
const fraction = (s: T) => (typeof s.remaining === 'number' && typeof s.initial === 'number' && s.initial > 0 ? s.remaining / s.initial : null);
const meta = (s: T) => [s.vendor, s.material, `#${s.id}`, s.location].filter(Boolean).join(' · ');

// ---------------------------------------------------------------- the swatches: one tab stop, arrows move
const grid = ref<HTMLElement | null>(null);
const input = ref<{ $el: HTMLInputElement } | null>(null);
const at = ref(0);
watch(groups, gs => { if (at.value >= gs.length) at.value = 0; });
function focusAt(i: number) {
  at.value = Math.max(0, Math.min(groups.value.length - 1, i));
  void nextTick(() => grid.value?.querySelectorAll<HTMLElement>('[data-colour]')[at.value]?.focus());
}
/** Swatches in the first row: Up/Down move by that many. */
function perRow(): number {
  const items = [...(grid.value?.querySelectorAll<HTMLElement>('[data-colour]') ?? [])];
  const top = items[0]?.offsetTop;
  return Math.max(1, items.filter(el => el.offsetTop === top).length);
}
function gridKey(e: KeyboardEvent) {
  const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow(), ArrowUp: -perRow() }[e.key];
  if (step !== undefined) {
    e.preventDefault();
    if (step < 0 && at.value + step < 0 && input.value) input.value.$el.focus(); else focusAt(at.value + step);
  } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); focusAt(e.key === 'Home' ? 0 : groups.value.length - 1); }
}
function searchKey(e: KeyboardEvent) {
  if (!groups.value.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(0); }
  if (e.key === 'Enter') { e.preventDefault(); at.value = 0; choose(groups.value[0], grid.value?.querySelector<HTMLElement>('[data-colour]') ?? null); }
}
function rootKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); emit('close'); }
}

// ---------------------------------------------------------------- one colour: pick, or the dialog of its spools
const open = shallowRef<OuiColourGroup<T> | null>(null);
const visible = ref(false);
let opener: HTMLElement | null = null;
let pending: { spool: T } | null = null;
function choose(g: OuiColourGroup<T>, from: HTMLElement | null) {
  if (g.spools.length === 1) { emit('pick', g.spools[0].id, g.spools[0]); return; }
  opener = from; pending = null; open.value = g; visible.value = true;
}
const list = ref<HTMLElement | null>(null);
// PrimeVue's Dialog focuses its [autofocus] element once open: the picked spool when it has this colour, else the fullest.
const firstRow = computed(() => (open.value?.spools.find(s => s.id === props.selected) ?? open.value?.spools[0])?.id);
function rowKey(e: KeyboardEvent) {
  const rows = [...(list.value?.querySelectorAll<HTMLElement>('[data-spool]') ?? [])];
  const i = rows.indexOf(document.activeElement as HTMLElement);
  const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  if (step && i >= 0) { e.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, i + step))].focus(); }
  if ((e.key === 'Home' || e.key === 'End') && rows.length) { e.preventDefault(); rows[e.key === 'Home' ? 0 : rows.length - 1].focus(); }
}
function take(s: T) { pending = { spool: s }; visible.value = false; }
function afterHide() {
  const back = opener, chosen = pending;
  opener = null; pending = null; open.value = null;
  if (back?.isConnected) back.focus();
  if (chosen) emit('pick', chosen.spool.id, chosen.spool);
}
</script>
<template>
  <div class="oui-spick" role="group" :aria-label="labels.label" @keydown="rootKey">
    <InputText v-if="labels.search" ref="input" v-model="query" type="search" size="small" class="oui-spick-q" :placeholder="labels.search" :aria-label="labels.search"
      data-spick="search" @keydown="searchKey" />
    <div v-if="materials.length > 1" class="oui-spick-mats" role="group" :aria-label="labels.allMaterials">
      <button type="button" class="oui-chip oui-spick-mat" :aria-pressed="!materials.includes(material)" @click="material = ''">{{ labels.allMaterials }}</button>
      <button v-for="m in materials" :key="m" type="button" class="oui-chip oui-spick-mat" :aria-pressed="material === m" :data-material="m"
        @click="material = material === m ? '' : m">{{ m }}</button>
    </div>
    <div ref="grid" class="oui-spick-grid" :data-named="named || undefined" @keydown="gridKey">
      <button v-if="labels.none" type="button" class="oui-spick-none" :aria-current="selected == null || undefined" data-spick="none" @click="emit('pick', null, null)">{{ labels.none }}</button>
      <button v-for="(g, i) in groups" :key="g.key" type="button" class="oui-spick-c" :tabindex="i === at ? 0 : -1" :data-colour="g.key || 'none'"
        :aria-current="g.key === selectedKey || undefined" :aria-haspopup="g.spools.length > 1 ? 'dialog' : undefined" :aria-label="groupLabel(g)" :title="groupLabel(g)"
        @focus="at = i" @click="choose(g, $event.currentTarget as HTMLElement)">
        <span class="oui-spick-dot"><OuiSwatch :color="g.colour" :colors="g.colours" :size="28" />
          <span v-if="g.spools.length > 1" class="oui-spick-n oui-num" aria-hidden="true">{{ g.spools.length }}</span></span>
        <span v-if="named" class="oui-spick-name" aria-hidden="true">{{ nameOf(g) }}</span>
      </button>
    </div>
    <p v-if="labels.hint && groups.length" class="oui-meta oui-spick-hint">{{ labels.hint }}</p>
    <p v-if="!groups.length" class="oui-meta oui-spick-empty">{{ query.trim() && labels.noMatch ? labels.noMatch : labels.empty }}</p>
    <Dialog v-model:visible="visible" modal :header="labels.choose" :style="{ width: '440px', maxWidth: 'calc(100vw - 32px)' }" data-spick="dialog"
    @after-hide="afterHide">
    <template v-if="open">
      <p class="oui-meta oui-spick-sub"><OuiSwatch :color="open.colour" :colors="open.colours" :size="14" />{{ groupLabel(open) }}</p>
      <div ref="list" class="oui-spick-list" @keydown="rowKey">
        <button v-for="s in open.spools" :key="s.id" type="button" class="oui-spick-row" :data-spool="s.id" :aria-current="s.id === selected || undefined"
          :autofocus="s.id === firstRow || undefined" @click="take(s)">
          <span class="oui-spick-t"><span class="oui-truncate">{{ s.name || `#${s.id}` }}</span><small class="oui-meta oui-truncate">{{ meta(s) }}</small></span>
          <span class="oui-spick-w"><span class="oui-num">{{ gramsText(s.remaining) }}</span>
            <OuiLevel :fraction="fraction(s)" :tone="s.low ? 'low' : 'normal'" :label="gramsText(s.remaining)" /></span>
        </button>
      </div>
    </template>
    </Dialog>
  </div>
</template>
<style>
.oui-spick { display: grid; gap: var(--oui-s2); min-width: 0; }
.oui-spick-q { width: 100%; min-width: 0; }
.oui-spick-mats { display: flex; flex-wrap: wrap; gap: 4px; }
/* The material filter: buttons of the small control height, not 16 px tags. */
.orca-ui .oui-spick-mat { height: var(--oui-control-sm); padding: 0 10px; border: 0; border-radius: var(--oui-radius); font: inherit; font-size: var(--oui-text-sm); font-weight: 600; cursor: pointer; }
.orca-ui .oui-spick-mat:hover { color: var(--oui-text); }
.orca-ui .oui-spick-mat[aria-pressed='true'] { background: var(--oui-primary-soft); color: var(--oui-text); box-shadow: inset 0 0 0 1px var(--oui-primary-mark); }
.oui-spick-grid { display: flex; flex-wrap: wrap; gap: 6px; max-height: 240px; overflow: auto; padding: 2px; }
.orca-ui .oui-spick-c { position: relative; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: var(--oui-radius-sm);
  background: none; cursor: pointer; }
.orca-ui .oui-spick-c:hover { background: var(--oui-control); }
.orca-ui .oui-spick-c:focus-visible { outline: 2px solid var(--oui-primary-mark); outline-offset: 0; }
.orca-ui .oui-spick-c[aria-current='true'] { box-shadow: inset 0 0 0 2px var(--oui-primary-mark); }
/* Named: a 72 px cell, the swatch over its name (two lines at most). */
.oui-spick-dot { position: relative; display: grid; place-items: center; width: 40px; height: 36px; }
.oui-spick-grid[data-named] { max-height: 320px; }
.orca-ui .oui-spick-grid[data-named] .oui-spick-c { width: 72px; height: auto; min-height: 66px; align-content: start; justify-items: center; gap: 1px; padding: 2px 2px 4px; }
.oui-spick-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; max-width: 100%; font-size: var(--oui-text-xs); line-height: 1.25;
  text-align: center; overflow-wrap: anywhere; color: var(--oui-text); }
.oui-spick-hint { margin: 0; }
.oui-spick-n { position: absolute; inset: auto 0 0 auto; min-width: 16px; padding: 0 3px; border-radius: 8px; background: var(--oui-raised); color: var(--oui-text);
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; box-shadow: 0 0 0 1px var(--oui-border); }
.orca-ui .oui-spick-none { height: 40px; padding: 0 var(--oui-s2); border: 1px dashed var(--oui-control-border); border-radius: var(--oui-radius-sm); background: none;
  color: var(--oui-text); font: inherit; font-size: var(--oui-text-sm); cursor: pointer; }
.orca-ui .oui-spick-none[aria-current='true'] { border-style: solid; border-color: var(--oui-primary-mark); }
.oui-spick-empty { margin: 0; padding: var(--oui-s2); }
.oui-spick-sub { display: flex; align-items: center; gap: 6px; margin: 0 0 var(--oui-s2); }
.oui-spick-list { display: grid; gap: 2px; max-height: min(60vh, 420px); overflow: auto; }
/* ponytail: rows out of view are not laid out or painted (content-visibility), which is what several hundred spools of one
   colour cost; their DOM nodes are still made. Window the list if a colour ever holds thousands. */
.orca-ui .oui-spick-row { content-visibility: auto; contain-intrinsic-size: auto 46px; display: flex; align-items: center; gap: var(--oui-s2); min-width: 0; padding: 6px var(--oui-s2); border: 0; border-radius: var(--oui-radius-sm);
  background: none; color: var(--oui-text); font: inherit; text-align: start; cursor: pointer; }
.orca-ui .oui-spick-row:hover, .orca-ui .oui-spick-row:focus-visible { background: var(--oui-control); }
.orca-ui .oui-spick-row[aria-current='true'] { background: var(--oui-primary-soft); }
.oui-spick-t { display: grid; flex: 1; min-width: 0; }
.oui-spick-w { display: grid; gap: 4px; justify-items: end; width: 84px; flex: none; }
.oui-spick-w .oui-level { width: 100%; }
</style>
