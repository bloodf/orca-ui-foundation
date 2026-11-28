<script lang="ts">
import type { Component, InjectionKey, Ref } from 'vue';
import type { OuiIconData } from '../icons';
import type { OuiDashboardState, OuiLayoutItem, OuiWidgetSpec, OuiWidgetValue } from './layout';

/** A widget the page offers: its place in the catalogue, its sizes (columns of 12, rows of 32 px) and its settings.
 *  `component` is the module itself (an OuiPanel); it gets `config` (settings with defaults filled in) when it has settings. */
export interface OuiWidget extends OuiWidgetSpec { title: string; icon?: OuiIconData; /** One line in the catalogue. */ text?: string; component: Component;
  /** The module fills the size it is given (a picture, a log): it is as tall as its rows. Every other widget is as tall
   *  as its content, whatever its rows, so nothing is cut off and nothing is padded out at any window width. */
  fill?: boolean;
  /** Its place in the single column of a narrow window (lower first). Widgets without one follow, in reading order. */
  narrowOrder?: number }
export interface OuiDashboardLabels {
  toolbar: string; layout: string; edit: string; save: string; cancel: string; add: string; addTitle: string; added: string; close: string;
  newLayout: string; rename: string; remove: string; reset: string; create: string; apply: string; keep: string;
  removeAsk: (name: string) => string; nameEmpty: string; nameTaken: string; settings: (widget: string) => string; removeWidget: (widget: string) => string;
  widget: (widget: string) => string; place: (widget: string, x: number, y: number, w: number, h: number) => string; removed: (widget: string) => string;
  hint: string; narrow: string; empty: string; maximize: string; restore: string;
  /** The button that opens New, Rename and Delete layout. */ layoutMenu: string;
}
export const OUI_DASHBOARD_LABELS: OuiDashboardLabels = {
  toolbar: 'Dashboard layout', layout: 'Layout', edit: 'Edit layout', save: 'Save layout', cancel: 'Cancel', add: 'Add widget', addTitle: 'Widgets', added: 'On the dashboard', close: 'Close',
  newLayout: 'New layout', rename: 'Rename layout', remove: 'Delete layout', reset: 'Reset to default', create: 'Create', apply: 'Rename', keep: 'Keep it',
  removeAsk: name => `Delete the layout “${name}”? This cannot be undone.`, nameEmpty: 'Type a name.', nameTaken: 'Another layout has this name.',
  settings: w => `${w} settings`, removeWidget: w => `Remove ${w}`, widget: w => `${w}: drag to move, arrow keys move, Shift and arrow keys resize, Delete removes`,
  place: (w, x, y, cw, ch) => `${w}: column ${x}, row ${y}, ${cw} by ${ch}`, removed: w => `${w} removed`,
  hint: 'Drag a widget to move it and its edges or corners to resize it. Keyboard: arrow keys move, Shift and arrow keys resize, Delete removes.',
  narrow: 'Widen the window to edit the layout.', empty: 'No widgets on this layout. Edit the layout to add some.', maximize: 'Maximise', restore: 'Restore', layoutMenu: 'Layout actions',
};
/** What OuiWidgetMaximize reads: the widget shown alone, and the switch. */
export const OUI_DASH_MAX: InjectionKey<{ max: Ref<string>; toggle: (id: string) => void; labels: () => OuiDashboardLabels }> = Symbol('oui-dash-max');
export type { OuiDashboardState, OuiLayoutItem, OuiWidgetValue };
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type RendererElement } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import OuiIcon from './OuiIcon.vue';
import OuiMenu, { type OuiMenuItem } from './OuiMenu.vue';
import { dashboard, edit, more, plus, settings as gear, trash, undo, x as close, check } from '../icons';
import { COLS, MAX_LAYOUTS, add, cleanName, minHeight, move, nameProblem, ordered, packTops, remove, resize, validate, type OuiLayout } from './layout';

/*
 * The dashboard as a grid the user arranges: widgets on 12 columns and 32 px rows, rising to fill holes. Edit layout
 * shows quiet grid dots and, on each widget, a frame to drag, handles on its edges and corners, its settings and Remove;
 * the catalogue adds widgets. Layouts are named, switched, renamed, deleted and reset; Save keeps the edit. The page
 * stores what `update:modelValue` gives (the plugin's own settings) and hands it back as `modelValue`; anything stored
 * that does not read as a dashboard falls back to `defaults`, and unknown widgets are dropped.
 * Dragging and resizing use pointer events, never HTML5 drag and drop (OrcaSlicer on macOS swallows drops; see
 * OuiFileBrowser). A grid narrower than `narrowAt` is one column (in `narrowOrder`, then reading order), and is not edited.
 *
 * Outside edit mode every column packs on its own: a widget is as tall as its content (a `fill` widget as tall as its
 * rows) and sits right under the widget above it in its own columns, so a tall card neither stretches nor pushes the
 * cards beside it. The rows of 32 px are the edit grid: there a row still grows to fit the tallest widget on it.
 *
 * `editTo` (a selector or an element, e.g. a span in the page header's actions) is where the layout Select and the
 * "Edit layout" button go while the dashboard is not being edited, so they do not take a row of their own over the cards.
 */
const props = withDefaults(defineProps<{ widgets: OuiWidget[]; defaults: OuiLayout; modelValue?: unknown; labels?: Partial<OuiDashboardLabels>; narrowAt?: number;
  editTo?: string | RendererElement | null }>(), { narrowAt: 640 });
const emit = defineEmits<{ 'update:modelValue': [state: OuiDashboardState] }>();
const L = computed<OuiDashboardLabels>(() => ({ ...OUI_DASHBOARD_LABELS, ...props.labels }));
const ROW = 32, GAP = 12, SLOP = 4;

const state = computed(() => validate(props.modelValue, props.widgets, props.defaults));
const layout = computed(() => state.value.layouts[state.value.active]);
const def = (id: string) => props.widgets.find(w => w.id === id)!;
const sizeOf = (id: string) => props.widgets.find(w => w.id === id);
const titleOf = (id: string) => def(id)?.title ?? id;
function store(next: Omit<OuiDashboardState, 'v'>) { emit('update:modelValue', { v: 1, active: next.active, layouts: next.layouts.map(l => ({ name: l.name, items: l.items.map(i => ({ ...i })) })) }); }

// Edit mode works on a draft of the open layout's widgets; Save stores it, Cancel drops it.
const editing = ref(false);
const draft = ref<OuiLayoutItem[]>([]);
const preview = ref<OuiLayoutItem[] | null>(null);
const dirty = computed(() => editing.value && JSON.stringify(draft.value) !== JSON.stringify(layout.value.items));
const items = computed(() => (editing.value ? preview.value ?? draft.value : layout.value.items));
function startEdit() { if (narrow.value) return; draft.value = layout.value.items.map(i => ({ ...i })); strip.value = null; max.value = ''; editing.value = true; }
function stopEdit() { editing.value = false; preview.value = null; strip.value = null; }
function saveEdit() { store({ active: state.value.active, layouts: state.value.layouts.map((l, i) => (i === state.value.active ? { ...l, items: draft.value } : l)) }); stopEdit(); }
function choose(i: number) { if (i !== state.value.active) store({ ...state.value, active: i }); }
watch(() => state.value.active, () => { if (editing.value && !dirty.value) draft.value = layout.value.items.map(i => ({ ...i })); });

// One at a time: a strip under the bar (a name for new or rename, the delete question, the catalogue), or a widget's
// settings in a small panel on that widget, under its gear.
type Strip = { kind: 'new' | 'rename' | 'delete' | 'add' } | { kind: 'settings'; id: string };
const strip = ref<Strip | null>(null);
const name = ref('');
const nameError = ref('');
const nameField = ref<{ $el: HTMLInputElement } | null>(null);
function open(s: Strip) {
  strip.value = strip.value?.kind === s.kind && (s.kind !== 'settings' || (strip.value as { id: string }).id === s.id) ? null : s;
  name.value = s.kind === 'rename' ? layout.value.name : ''; nameError.value = '';
  if (s.kind === 'new' || s.kind === 'rename') void nextTick(() => nameField.value?.$el.focus());
  if (s.kind === 'settings' && strip.value) void nextTick(() => grid.value?.querySelector<HTMLElement>('.oui-dash-pop :is(input, [role="combobox"], button)')?.focus());
}
function closeSettings() {
  const id = strip.value?.kind === 'settings' ? strip.value.id : '';
  strip.value = null;
  if (id) void nextTick(() => grid.value?.querySelector<HTMLElement>(`[data-settings="${CSS.escape(id)}"]`)?.focus());
}
// New, Rename and Delete layout sit in one menu beside the layout Select.
const menu = ref<InstanceType<typeof OuiMenu>>();
const layoutItems = computed<OuiMenuItem[]>(() => [
  { id: 'dash-new', label: L.value.newLayout, icon: plus, disabled: state.value.layouts.length >= MAX_LAYOUTS, run: () => open({ kind: 'new' }) },
  { id: 'dash-rename', label: L.value.rename, icon: edit, run: () => open({ kind: 'rename' }) },
  { id: 'dash-delete', label: L.value.remove, icon: trash, danger: true, disabled: state.value.layouts.length < 2, run: () => open({ kind: 'delete' }) },
]);
function commitName() {
  const renaming = strip.value?.kind === 'rename';
  const problem = nameProblem(name.value, state.value.layouts, renaming ? state.value.active : -1);
  if (problem) { nameError.value = problem === 'empty' ? L.value.nameEmpty : L.value.nameTaken; return; }
  const n = cleanName(name.value), ls = state.value.layouts;
  if (renaming) store({ active: state.value.active, layouts: ls.map((l, i) => (i === state.value.active ? { ...l, name: n } : l)) });
  else if (ls.length < MAX_LAYOUTS) store({ active: ls.length, layouts: [...ls, { name: n, items: draft.value.map(i => ({ ...i })) }] });
  strip.value = null;
}
function deleteLayout() {
  const ls = state.value.layouts.filter((_, i) => i !== state.value.active);
  store({ active: 0, layouts: ls });
  draft.value = ls[0].items.map(i => ({ ...i }));
  strip.value = null;
}
function resetLayout() { draft.value = validate(null, props.widgets, props.defaults).layouts[0].items; say(L.value.reset); }
function addWidget(id: string) { const s = sizeOf(id); if (!s) return; draft.value = add(draft.value, id, s); say(placeText(id)); }
function removeWidget(id: string) { draft.value = remove(draft.value, id); if (strip.value?.kind === 'settings' && strip.value.id === id) strip.value = null; say(L.value.removed(titleOf(id))); }
const options = computed(() => state.value.layouts.map((l, i) => ({ value: i, label: l.name })));

// Settings: the widget's stored values over its defaults.
const configOf = (it: OuiLayoutItem) => Object.fromEntries((def(it.id)?.settings ?? []).map(s => [s.key, it.cfg?.[s.key] ?? s.default]));
const settingsFor = computed(() => (strip.value?.kind === 'settings' ? draft.value.find(i => i.id === (strip.value as { id: string }).id) : undefined));
function setValue(key: string, value: OuiWidgetValue) {
  const id = settingsFor.value?.id;
  draft.value = draft.value.map(i => (i.id === id ? { ...i, cfg: { ...i.cfg, [key]: value } } : i));
}

// The grid's own width decides the column width and whether it is narrow.
const grid = ref<HTMLElement | null>(null);
const width = ref(1000);
let ro: ResizeObserver | undefined;
// Read in the next frame: a change of width can change the layout (one column), which would resize the grid again
// inside the observer's own callback.
let frame = 0;
onMounted(() => {
  ro = new ResizeObserver(([e]) => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { width.value = e.contentRect.width; }); });
  if (grid.value) ro.observe(grid.value);
  cellSizes = new ResizeObserver(measure);
  watchCells();
});
const narrow = computed(() => width.value < props.narrowAt);
watch(narrow, n => { if (n && editing.value) stopEdit(); });
const stepX = computed(() => (width.value + GAP) / COLS);
const STEP_Y = ROW + GAP;
const shown = computed(() => {
  if (!narrow.value) return items.value;
  const read = ordered(items.value), rank = (it: OuiLayoutItem) => sizeOf(it.id)?.narrowOrder;
  return [...read.filter(i => rank(i) != null).sort((a, b) => rank(a)! - rank(b)!), ...read.filter(i => rank(i) == null)];
});

// Outside edit mode the columns pack on their own (see the header): every widget is on the grid's one row, in its own
// columns, pushed down by a top margin that is the measured height of what is above it in those columns (packTops).
// The cells are measured whenever one of them changes size; a margin changes no cell's size, so this settles at once.
const packed = computed(() => !editing.value && !narrow.value && !max.value);
const rowsPx = (h: number) => h * ROW + (h - 1) * GAP;
const heights = ref<Record<string, number>>({});
const tops = computed(() => packTops(items.value, it => (def(it.id)?.fill ? rowsPx(it.h) : heights.value[it.id] ?? rowsPx(it.h)), GAP));
let cellSizes: ResizeObserver | undefined;
function measure() {
  if (!packed.value || !grid.value) return;
  const next: Record<string, number> = {};
  for (const el of grid.value.querySelectorAll<HTMLElement>(':scope > .oui-dash-cell')) next[el.dataset.widget ?? ''] = el.getBoundingClientRect().height;
  const now = heights.value, ids = Object.keys(next);
  if (ids.length !== Object.keys(now).length || ids.some(id => Math.abs((now[id] ?? -9) - next[id]) > 0.5)) heights.value = next;
}
function watchCells() {
  if (!cellSizes || !grid.value) return;
  cellSizes.disconnect();
  for (const el of grid.value.querySelectorAll(':scope > .oui-dash-cell')) cellSizes.observe(el);
  measure();
}
function cellStyle(it: OuiLayoutItem) {
  if (narrow.value) return undefined;
  if (max.value) return max.value === it.id ? { height: maxHeight.value + 'px' } : undefined;
  const gridColumn = `${it.x + 1} / span ${it.w}`;
  if (!packed.value) return { gridColumn, gridRow: `${it.y + 1} / span ${it.h}` };
  return { gridColumn, gridRow: '1', marginTop: `${tops.value[it.id] ?? 0}px`, height: def(it.id)?.fill ? `${rowsPx(it.h)}px` : undefined };
}

// Dragging (the frame) and resizing (a handle) with pointer events. The draft changes only on release; meanwhile
// `preview` is the layout as it would be, and the dragged widget follows the pointer over its place-to-be.
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLES: Handle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
let op: { id: string; handle?: Handle; pointer: number; x: number; y: number; start: OuiLayoutItem; el: HTMLElement; tops: number[]; gy: number; top: number } | null = null;
// Where each row starts (px from the grid's top), as laid out: a row grows to fit a widget's content, so rows are not all
// one height. Past the last row they go on at the row's own height.
function rowTops(): number[] {
  const g = grid.value;
  const sizes = g ? getComputedStyle(g).gridTemplateRows.split(' ').map(parseFloat).filter(n => Number.isFinite(n)) : [];
  return sizes.reduce((tops, h) => [...tops, tops[tops.length - 1] + h + GAP], [0]);
}
const topOf = (tops: number[], row: number) => (row < tops.length ? tops[row] : tops[tops.length - 1] + (row - tops.length + 1) * STEP_Y);
/** The row a point is in, with its fraction (2.5 = halfway down the third row). */
function rowAt(tops: number[], y: number): number {
  let k = 0;
  while (k + 1 < tops.length && tops[k + 1] <= y) k++;
  if (k + 1 >= tops.length) return k + (y - tops[k]) / STEP_Y;
  return k + (y - tops[k]) / (tops[k + 1] - tops[k]);
}
const dragged = ref('');
/** The widget being resized: its size in grid units shows only meanwhile. */
const sizing = ref('');
const offset = ref({ x: 0, y: 0 });
function down(event: PointerEvent, it: OuiLayoutItem, handle?: Handle) {
  if (event.button !== 0 || !event.isPrimary || op || (event.target as HTMLElement).closest('button, .oui-dash-pop')) return;
  op = { id: it.id, handle, pointer: event.pointerId, x: event.clientX, y: event.clientY, start: { ...it }, el: event.currentTarget as HTMLElement,
    tops: rowTops(), top: grid.value?.getBoundingClientRect().top ?? 0, gy: 0 };
  op.gy = event.clientY - op.top;
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel); window.addEventListener('keydown', onEscape, true);
}
function onMove(event: PointerEvent) {
  if (!op || event.pointerId !== op.pointer) return;
  // Measured against the grid, not the window: the page may scroll while the pointer is down.
  const dx = event.clientX - op.x, dy = event.clientY - op.y + op.top - (grid.value?.getBoundingClientRect().top ?? op.top);
  if (!dragged.value) {
    if (!(event.buttons & 1)) { end(); return; } // released where no pointerup reached us, before the drag began
    if (Math.hypot(dx, dy) < SLOP) return;
    dragged.value = op.id; if (op.handle) sizing.value = op.id;
    try { op.el.setPointerCapture(op.pointer); } catch { /* gone already: the up that follows ends it */ }
  }
  const s = op.start, cx = Math.round(dx / stepX.value), cy = Math.round(rowAt(op.tops, op.gy + dy) - rowAt(op.tops, op.gy)), size = sizeOf(op.id);
  if (!op.handle) {
    preview.value = move(draft.value, op.id, s.x + cx, s.y + cy, sizeOf);
    const now = preview.value.find(i => i.id === op!.id)!;
    offset.value = { x: dx - (now.x - s.x) * stepX.value, y: dy - (topOf(op.tops, now.y) - topOf(op.tops, s.y)) };
    return;
  }
  const h = op.handle, minW = size?.minW ?? 1, maxW = size?.maxW ?? COLS, maxH = size?.maxH ?? 200;
  let { x, y, w, h: ht } = s;
  if (h.includes('e')) w = s.w + cx;
  if (h.includes('s')) ht = s.h + cy;
  if (h.includes('w')) { const d = Math.max(-s.x, s.w - maxW, Math.min(cx, s.w - minW)); x = s.x + d; w = s.w - d; }
  if (h.includes('n')) { const d = Math.max(-s.y, s.h - maxH, Math.min(cy, s.h - minHeight(size, w))); y = s.y + d; ht = s.h - d; }
  preview.value = resize(draft.value, op.id, w, ht, sizeOf, x, y);
}
function end() {
  window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); window.removeEventListener('keydown', onEscape, true);
  op = null; dragged.value = ''; sizing.value = ''; offset.value = { x: 0, y: 0 }; preview.value = null;
}
function onUp(event: PointerEvent) {
  if (!op || event.pointerId !== op.pointer) return;
  const id = op.id, moved = !!dragged.value && preview.value;
  if (moved) { draft.value = preview.value!; say(placeText(id)); }
  end();
}
function onCancel(event: PointerEvent) { if (op && event.pointerId === op.pointer) end(); }
function onEscape(event: KeyboardEvent) { if (event.key === 'Escape' && op) { event.preventDefault(); event.stopPropagation(); end(); } }
onBeforeUnmount(() => { if (op) end(); ro?.disconnect(); cellSizes?.disconnect(); cancelAnimationFrame(frame); });

// The keyboard does the same on a focused widget frame: arrows move by one column or row (up and down past the
// neighbour, since widgets rise), Shift and arrows resize, Delete removes.
function onKey(event: KeyboardEvent, it: OuiLayoutItem) {
  if (event.target !== event.currentTarget) return;
  const dir = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[event.key];
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeWidget(it.id); void nextTick(() => grid.value?.querySelector<HTMLElement>('.oui-dash-frame')?.focus()); return; }
  if (!dir) return;
  event.preventDefault();
  const [dx, dy] = dir;
  let next = draft.value;
  if (event.shiftKey) next = resize(draft.value, it.id, it.w + dx, it.h + dy, sizeOf);
  else for (let k = 1; k <= 60 && JSON.stringify(next) === JSON.stringify(draft.value); k++) {
    next = move(draft.value, it.id, it.x + dx * k, it.y + dy * k, sizeOf);
    if (dx) break;
  }
  draft.value = next;
  say(placeText(it.id));
}

const said = ref('');
function say(text: string) { said.value = ''; void nextTick(() => { said.value = text; }); }
function placeText(id: string) { const it = draft.value.find(i => i.id === id); return it ? L.value.place(titleOf(id), it.x + 1, it.y + 1, it.w, it.h) : ''; }

// Maximise: one widget shown alone, as tall as the window below the grid's top. Escape or Restore brings the grid back.
const max = ref('');
const maxHeight = ref(480);
function toggle(id: string) {
  if (editing.value) return;
  max.value = max.value === id ? '' : id;
  if (max.value && grid.value) maxHeight.value = Math.max(320, Math.floor(window.innerHeight - Math.max(0, grid.value.getBoundingClientRect().top) - GAP));
}
const onMaxKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && max.value && !e.defaultPrevented) { max.value = ''; } };
watch(max, on => { if (on) window.addEventListener('keydown', onMaxKey); else window.removeEventListener('keydown', onMaxKey); });
watch(() => items.value.map(i => i.id).join(), () => { if (max.value && !items.value.some(i => i.id === max.value)) max.value = ''; });
onBeforeUnmount(() => window.removeEventListener('keydown', onMaxKey));
provide(OUI_DASH_MAX, { max, toggle, labels: () => L.value });
// The cells to measure follow the widgets shown; coming back to the packed view measures them as they are now.
watch(() => shown.value.map(i => i.id).join(), watchCells, { flush: 'post' });
watch(packed, on => { if (on) measure(); }, { flush: 'post' });
defineExpose({ edit: startEdit, save: saveEdit, cancel: stopEdit });
</script>

<template>
  <div class="oui-dash-board" :data-editing="editing || undefined">
    <!-- While the dashboard is not edited, the bar (the layout Select and Edit layout) can live in the page header (editTo). -->
    <Teleport :to="editTo" :disabled="!editTo || editing" defer>
      <div class="oui-dash-bar" :data-away="(!!editTo && !editing) || undefined" role="toolbar" :aria-label="L.toolbar">
        <Select v-if="options.length > 1 || editing" :model-value="state.active" :options="options" option-label="label" option-value="value" size="small"
                :aria-label="L.layout" :disabled="dirty" class="oui-dash-pick" data-test="dash-layout" @update:model-value="choose" />
        <template v-if="editing">
          <Button severity="secondary" text size="small" :aria-label="L.layoutMenu" :title="L.layoutMenu" aria-haspopup="menu" data-test="dash-menu" @click="menu?.open($event, layoutItems)">
            <template #icon><OuiIcon :icon="more" :size="14" /></template></Button>
          <Button severity="secondary" text size="small" :label="L.reset" data-test="dash-reset" @click="resetLayout">
            <template #icon><OuiIcon :icon="undo" :size="14" /></template></Button>
          <span class="oui-spacer" />
          <Button severity="secondary" size="small" :label="L.add" :aria-expanded="strip?.kind === 'add'" aria-controls="oui-dash-strip" data-test="dash-add" @click="open({ kind: 'add' })">
            <template #icon><OuiIcon :icon="plus" :size="14" /></template></Button>
          <Button severity="secondary" text size="small" :label="L.cancel" data-test="dash-cancel" @click="stopEdit" />
          <Button size="small" :label="L.save" data-test="dash-save" @click="saveEdit"><template #icon><OuiIcon :icon="check" :size="14" /></template></Button>
        </template>
        <template v-else>
          <span class="oui-spacer" />
          <Button severity="secondary" text size="small" :label="L.edit" :disabled="narrow" :title="narrow ? L.narrow : undefined" data-test="dash-edit" @click="startEdit">
            <template #icon><OuiIcon :icon="dashboard" :size="14" /></template></Button>
        </template>
      </div>
    </Teleport>

    <div v-if="editing && strip && strip.kind !== 'settings'" id="oui-dash-strip" class="oui-dash-strip" data-test="dash-strip">
      <form v-if="strip.kind === 'new' || strip.kind === 'rename'" class="oui-dash-name" @submit.prevent="commitName">
        <label for="oui-dash-name" class="oui-strong">{{ strip.kind === 'new' ? L.newLayout : L.rename }}</label>
        <InputText id="oui-dash-name" ref="nameField" v-model="name" size="small" :maxlength="40" :invalid="!!nameError" :aria-describedby="nameError ? 'oui-dash-name-error' : undefined"
                   @input="nameError = ''" @keydown.escape.prevent="strip = null" />
        <Button type="submit" size="small" :label="strip.kind === 'new' ? L.create : L.apply" data-test="dash-name-ok" />
        <Button severity="secondary" text size="small" :label="L.cancel" @click="strip = null" />
        <span v-if="nameError" id="oui-dash-name-error" class="oui-dash-error" role="alert">{{ nameError }}</span>
      </form>
      <div v-else-if="strip.kind === 'delete'" class="oui-dash-name" role="alertdialog" :aria-label="L.remove">
        <span>{{ L.removeAsk(layout.name) }}</span>
        <Button severity="danger" size="small" :label="L.remove" data-test="dash-delete-ok" @click="deleteLayout" />
        <Button severity="secondary" text size="small" :label="L.keep" @click="strip = null" />
      </div>
      <div v-else-if="strip.kind === 'add'" class="oui-dash-cat" role="group" :aria-label="L.addTitle" data-test="dash-catalogue">
        <div v-for="w in widgets" :key="w.id" class="oui-dash-cat-item" :data-widget="w.id">
          <OuiIcon v-if="w.icon" :icon="w.icon" :size="16" tile />
          <span class="oui-dash-cat-text"><span class="oui-strong">{{ w.title }}</span><span v-if="w.text" class="oui-meta">{{ w.text }}</span></span>
          <span v-if="draft.some(i => i.id === w.id)" class="oui-meta">{{ L.added }}</span>
          <Button v-else severity="secondary" size="small" :label="L.add" :aria-label="`${L.add}: ${w.title}`" :data-add="w.id" @click="addWidget(w.id)" />
        </div>
      </div>
    </div>
    <p v-if="editing" class="oui-meta oui-dash-hint">{{ L.hint }}</p>

    <div ref="grid" class="oui-dash-grid" :data-narrow="narrow || undefined" :data-max="max || undefined" :data-packed="packed || undefined" data-test="dash-grid">
      <p v-if="!items.length" class="oui-meta oui-dash-empty">{{ L.empty }}</p>
      <div v-if="dragged && !narrow" class="oui-dash-slot" :style="cellStyle(items.find(i => i.id === dragged)!)" aria-hidden="true" />
      <div v-for="it in shown" v-show="!max || max === it.id" :key="it.id" class="oui-dash-cell" :data-widget="it.id" :data-fill="def(it.id).fill || undefined" :data-dragged="dragged === it.id || undefined"
           :data-open="settingsFor?.id === it.id || undefined" :style="[cellStyle(it), dragged === it.id ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : null]">
        <div class="oui-dash-body" :inert="editing || undefined"><component :is="def(it.id).component" v-bind="def(it.id).settings ? { config: configOf(it) } : {}" /></div>
        <div v-if="editing" class="oui-dash-frame" tabindex="0" role="group" :aria-label="L.widget(titleOf(it.id))" :data-frame="it.id"
             @pointerdown="down($event, it)" @keydown="onKey($event, it)">
          <span class="oui-dash-frame-bar">
            <span class="oui-dash-frame-name">{{ titleOf(it.id) }}<span v-if="sizing === it.id" class="oui-num">{{ it.w }} × {{ it.h }}</span></span>
            <Button v-if="def(it.id).settings?.length" severity="secondary" size="small" :aria-label="L.settings(titleOf(it.id))" :title="L.settings(titleOf(it.id))"
                    :aria-expanded="settingsFor?.id === it.id" :data-settings="it.id" @click="open({ kind: 'settings', id: it.id })"><template #icon><OuiIcon :icon="gear" :size="14" /></template></Button>
            <Button severity="secondary" size="small" :aria-label="L.removeWidget(titleOf(it.id))" :title="L.removeWidget(titleOf(it.id))" :data-remove="it.id" @click="removeWidget(it.id)">
              <template #icon><OuiIcon :icon="close" :size="14" /></template></Button>
          </span>
          <!-- The widget's settings, on the widget, under its gear: nothing above the grid moves. -->
          <div v-if="settingsFor?.id === it.id" class="oui-dash-pop" role="group" :aria-label="L.settings(titleOf(it.id))" :data-side="it.x + it.w / 2 < COLS / 2 ? 'start' : 'end'" data-test="dash-settings"
               @pointerdown.stop @keydown.stop @keydown.escape.prevent="closeSettings">
            <p class="oui-strong">{{ L.settings(titleOf(it.id)) }}</p>
            <template v-for="s in def(it.id).settings" :key="s.key">
              <div v-if="s.options" class="oui-dash-set-row" data-kind="choice"><span>{{ s.label }}</span>
                <Select :model-value="configOf(it)[s.key]" :options="s.options" option-label="label" option-value="value" size="small" :aria-label="s.label"
                        :data-setting="s.key" @update:model-value="v => setValue(s.key, v)" /></div>
              <label v-else class="oui-dash-set-row"><ToggleSwitch :model-value="!!configOf(it)[s.key]" :aria-label="s.label" :data-setting="s.key" @update:model-value="v => setValue(s.key, v)" />
                <span>{{ s.label }}</span></label>
            </template>
            <Button severity="secondary" size="small" :label="L.close" class="oui-dash-pop-close" @click="closeSettings" />
          </div>
          <span v-for="h in HANDLES" :key="h" class="oui-dash-handle" :data-handle="h" aria-hidden="true" @pointerdown.stop="down($event, it, h)" />
        </div>
      </div>
    </div>
    <OuiMenu ref="menu" />
    <div class="oui-sr" aria-live="polite">{{ said }}</div>
  </div>
</template>

<style>
.oui-dash-board { display: grid; gap: var(--oui-s2); min-width: 0; }
.oui-dash-bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s1); min-height: var(--oui-control-sm); }
/* In the page header (editTo): the controls only, in line with the header's own actions. */
.oui-dash-bar[data-away] { display: inline-flex; flex-wrap: nowrap; }
.oui-dash-bar[data-away] > .oui-spacer { display: none; }
.oui-dash-pick { min-width: 160px; max-width: 260px; }
.oui-dash-strip { display: grid; gap: var(--oui-s2); padding: var(--oui-s2) var(--oui-s3); border-radius: var(--oui-radius-lg); background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-border); }
.oui-dash-name { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2); }
.oui-dash-error { flex-basis: 100%; color: var(--oui-danger); font-size: var(--oui-text-sm); }
/* A widget's settings: a small panel on the widget under its gear, on the side of the page the widget is on. Each
   setting is a row: a switch with its name after it, or a name over its choices. */
.oui-dash-cell[data-open] { z-index: 4; }
.oui-dash-pop { position: absolute; top: 44px; z-index: 2; display: grid; gap: var(--oui-s2); width: max-content; min-width: 200px; max-width: min(320px, 100vw - 32px); padding: var(--oui-s3);
  border-radius: var(--oui-radius-lg); background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-overlay); cursor: default; user-select: text; -webkit-user-select: text; }
.oui-dash-pop[data-side='end'] { right: 6px; } .oui-dash-pop[data-side='start'] { left: 6px; }
.oui-dash-set-row { display: flex; align-items: center; gap: var(--oui-s2); min-height: 28px; cursor: pointer; }
.oui-dash-set-row[data-kind='choice'] { display: grid; gap: var(--oui-s1); cursor: default; }
.oui-dash-set-row[data-kind='choice'] > span { font-size: var(--oui-text-sm); font-weight: 600; color: var(--oui-muted); }
.oui-dash-pop-close { justify-self: end; }
.oui-dash-cat { display: grid; gap: var(--oui-s1) var(--oui-s3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }
.oui-dash-cat-item { display: flex; align-items: center; gap: var(--oui-s2); min-height: 36px; }
.oui-dash-cat-text { display: grid; flex: 1 1 auto; min-width: 0; }
.oui-dash-hint { margin: 0; }
.oui-dash-empty { grid-column: 1 / -1; margin: 0; padding: var(--oui-s6); text-align: center; }

/* 12 columns. Outside edit mode (data-packed) every widget is on the one row, in its own columns, as tall as its content
   and pushed down by a margin to sit under what is above it in those columns (see the script): a tall card does not
   stretch its neighbours. In edit mode the rows are the grid: at least 32 px, growing when a widget's content needs more.
   A module's body is a container (oui-widget) for its width. A filling widget (camera, log) is as tall as its rows: its
   body is a size container, so it fits its content to both sizes (the camera keeps its picture's proportions, a log
   shows more lines). */
.oui-dash-grid { position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: minmax(32px, auto); gap: 12px; min-width: 0; }
.oui-dash-cell { position: relative; min-width: 0; }
.oui-dash-grid[data-packed] > .oui-dash-cell { align-self: start; }
.oui-dash-cell[data-fill] { min-height: 0; container: oui-cell / size; }
.oui-dash-body { height: 100%; min-height: 0; }
.oui-dash-body > .oui-panel { height: 100%; min-height: 0; }
.oui-dash-body > .oui-panel > .oui-panel-body { min-height: 0; container: oui-widget / inline-size; }
.oui-dash-cell[data-fill] .oui-dash-body > .oui-panel > .oui-panel-body { overflow: auto; container: oui-widget / size; }
.oui-dash-grid[data-max] .oui-dash-body > .oui-panel > .oui-panel-body { overflow: auto; }
/* Narrow: one column in reading order, each widget as tall as its content. */
.oui-dash-grid[data-narrow] { display: flex; flex-direction: column; }
.oui-dash-grid[data-narrow] > .oui-dash-cell { container: oui-cell / inline-size; }
.oui-dash-grid[data-narrow] .oui-dash-body > .oui-panel > .oui-panel-body { overflow: visible; container: oui-widget / inline-size; }
/* A camera keeps its picture's shape (--oui-camera-w / --oui-camera-h, 16 / 9 by default) and fits the widget both ways. */
.oui-dash-grid:not([data-narrow]) [data-fill] .oui-panel-body > .oui-camera { width: min(100%, 100cqh * var(--oui-camera-w, 16) / var(--oui-camera-h, 9)); min-height: 0; margin: 0 auto auto; border-radius: 0; }
/* The picture sits at the top of the widget, on the camera's own ground: a widget of another shape shows bars, not a gap,
   and a widget taller than its picture never puts the picture below the fold. */
.oui-dash-grid:not([data-narrow]) [data-fill] .oui-panel-body:has(> .oui-camera) { display: flex; background: var(--oui-inset); border-radius: 0 0 var(--oui-radius-lg) var(--oui-radius-lg); }
/* Maximised: the one widget, the full width, as tall as the window allows. */
.oui-dash-grid[data-max] { display: block; }

/* Edit mode, quiet: dots on the grid's lines, a hairline frame on each widget, handles only here. The frame's bar names
   the widget, so the module's own header is blank meanwhile: one name, and nothing under the bar. */
.oui-dash-board[data-editing] .oui-dash-body > .oui-panel > .oui-panel-head > * { visibility: hidden; }
.oui-dash-board[data-editing] .oui-dash-grid { min-height: 160px; background-image: radial-gradient(circle, var(--oui-control-border) 1px, transparent 1.4px);
  background-size: calc((100% + 12px) / 12) 44px; background-position: -6px -6px; }
.oui-dash-frame { position: absolute; inset: 0; z-index: 1; border-radius: var(--oui-radius-lg); background: color-mix(in srgb, var(--oui-background) 45%, transparent); box-shadow: inset 0 0 0 1px var(--oui-control-border); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
.oui-dash-frame:hover { box-shadow: inset 0 0 0 1px var(--oui-primary-mark); }
.oui-dash-frame:focus-visible { outline: 2px solid var(--oui-primary-mark); outline-offset: 2px; }
.oui-dash-frame-bar { position: absolute; inset: 6px 6px auto auto; max-width: calc(100% - 12px); display: flex; align-items: center; gap: var(--oui-s1); padding: 2px; border-radius: var(--oui-radius); background: var(--oui-raised); box-shadow: inset 0 0 0 1px var(--oui-border); }
.oui-dash-frame-name { flex: 0 1 auto; min-width: 0; overflow: hidden; padding: 2px 6px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.oui-dash-frame-name > .oui-num { margin-inline-start: var(--oui-s2); font-weight: 400; color: var(--oui-muted); }
.oui-dash-cell[data-dragged] { z-index: 3; }
.oui-dash-cell[data-dragged] .oui-dash-frame { cursor: grabbing; background: color-mix(in srgb, var(--oui-surface) 60%, transparent); box-shadow: inset 0 0 0 1px var(--oui-primary-mark), var(--oui-shadow-overlay); }
.oui-dash-slot { border-radius: var(--oui-radius-lg); background: var(--oui-primary-soft); box-shadow: inset 0 0 0 1px var(--oui-primary-mark); }
/* Handles: a 10 px square in each corner, a 24 px bar on each edge, inside the frame (a page may clip what sticks out). */
.oui-dash-handle { position: absolute; width: 10px; height: 10px; border-radius: 2px; background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-control-border); }
.oui-dash-frame:hover > .oui-dash-handle, .oui-dash-frame:focus-visible > .oui-dash-handle, .oui-dash-cell[data-dragged] .oui-dash-handle { box-shadow: inset 0 0 0 1.5px var(--oui-primary-mark); }
.oui-dash-handle[data-handle='n'], .oui-dash-handle[data-handle='s'] { left: calc(50% - 12px); width: 24px; height: 6px; cursor: ns-resize; }
.oui-dash-handle[data-handle='e'], .oui-dash-handle[data-handle='w'] { top: calc(50% - 12px); width: 6px; height: 24px; cursor: ew-resize; }
.oui-dash-handle[data-handle='n'] { top: 0; } .oui-dash-handle[data-handle='s'] { bottom: 0; }
.oui-dash-handle[data-handle='e'] { right: 0; } .oui-dash-handle[data-handle='w'] { left: 0; }
.oui-dash-handle[data-handle='nw'] { top: 0; left: 0; cursor: nwse-resize; } .oui-dash-handle[data-handle='se'] { right: 0; bottom: 0; cursor: nwse-resize; }
.oui-dash-handle[data-handle='ne'] { top: 0; right: 0; cursor: nesw-resize; } .oui-dash-handle[data-handle='sw'] { bottom: 0; left: 0; cursor: nesw-resize; }
@media (prefers-reduced-motion: no-preference) { .oui-dash-cell:not([data-dragged]) { transition: transform var(--oui-fast) var(--oui-ease); } }
@media (forced-colors: active) { .oui-dash-frame { border: 1px solid CanvasText; } .oui-dash-handle { background: CanvasText; } }
</style>
