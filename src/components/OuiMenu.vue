<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import OuiIcon from './OuiIcon.vue';
import type { OuiIconData } from '../icons';

/*
 * A context menu: a short list of actions at the pointer (right-click), or under the element (the keyboard's menu key or
 * Shift+F10, which send a contextmenu event with no coordinates). One instance per component:
 *   <OuiMenu ref="menu" />   @contextmenu="menu.open($event, items)"
 * The first item takes focus, arrows move, Enter picks, Escape closes; picking or Escape gives focus back to what opened it. It closes
 * when focus moves to another element or the pointer is pressed outside it; focus merely lost (another window) keeps it.
 * Opened by a button's click (`@click="menu.isOpen ? menu.close(true) : menu.open($event, items)"`), a press on that button
 * does not close it first, so the click can: give the button `aria-haspopup="menu"` and `:aria-expanded="menu?.isOpen"`.
 * `label` names the menu for screen readers.
 * Its own few lines rather than PrimeVue's ContextMenu (36 kB in a page).
 */
export interface OuiMenuItem { label: string; icon?: OuiIconData; danger?: boolean; disabled?: boolean; /** A line above this item. */ separator?: boolean; run: () => void;
  /** A test hook, set as data-menu on the item. */ id?: string }

defineProps<{ /** The menu's accessible name. */ label?: string }>();
const state = ref<{ x: number; y: number; items: OuiMenuItem[]; back: HTMLElement | null; /** Opened by a click on `back` (a menu button), not a right-click. */ button: boolean } | null>(null);
const el = ref<HTMLElement>();
/** Opens at the event; no items: nothing opens and the browser's own menu is left alone. */
function open(event: MouseEvent, items: OuiMenuItem[]) {
  if (!items.length) return;
  event.preventDefault(); event.stopPropagation();
  const at = event.currentTarget instanceof HTMLElement ? event.currentTarget : null; const r = at?.getBoundingClientRect();
  const keyboard = !event.clientX && !event.clientY && r;
  const button = event.type === 'click';
  // A right-click opens at the pointer; the menu key under the element; a menu button's click under the button, at its left.
  const [x, y] = button && r ? [r.left, r.bottom + 4] : keyboard ? [r.left + 16, r.bottom] : [event.clientX, event.clientY];
  state.value = { x, y, items, back: at, button };
  // Fixed, from wherever the containing block puts (0, 0); kept inside the window.
  nextTick(() => { const m = el.value; if (!m || !state.value) return; m.style.transform = 'none'; const box = m.getBoundingClientRect();
    const x = Math.max(4, Math.min(state.value.x, innerWidth - box.width - 4)); const y = Math.max(4, Math.min(state.value.y, innerHeight - box.height - 4));
    m.style.transform = `translate(${x - box.left}px, ${y - box.top}px)`; m.querySelector<HTMLElement>('button:not(:disabled)')?.focus(); });
}
function close(refocus = false) { const back = state.value?.back; state.value = null; if (refocus) back?.focus(); }
// Focus goes back to the opener first, so an action that opens a dialog or a field takes it from there, and one that does not leaves it there.
function pick(item: OuiMenuItem) { close(true); item.run(); }
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); close(true); return; }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
  event.preventDefault();
  const items = [...(el.value?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])]; const at = items.indexOf(document.activeElement as HTMLElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (at + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
  items[next]?.focus();
}
function onOut(event: FocusEvent) { const to = event.relatedTarget; if (to instanceof Node && !el.value?.contains(to)) close(); }
function onOutside(event: PointerEvent) {
  const target = event.target instanceof Node ? event.target : null;
  if (!state.value || (target && el.value?.contains(target))) return;
  if (state.value.button && target && state.value.back?.contains(target)) return;   // its own button: the click that follows closes it
  close();
}
watch(state, (on, was) => { if (!!on === !!was) return; if (on) window.addEventListener('pointerdown', onOutside, true); else window.removeEventListener('pointerdown', onOutside, true); });
onBeforeUnmount(() => window.removeEventListener('pointerdown', onOutside, true));
defineExpose({ open, close, contains: (node: Node | null) => !!node && !!el.value?.contains(node), get isOpen() { return !!state.value; } });
</script>
<template>
  <div v-if="state" ref="el" class="oui-menu" role="menu" :aria-label="label" @keydown="onKey" @focusout="onOut" @contextmenu.prevent>
    <template v-for="(item, i) in state.items" :key="i"><hr v-if="item.separator && i" class="oui-menu-sep" role="separator">
      <button type="button" role="menuitem" class="oui-menu-item" :data-danger="item.danger || undefined" :data-menu="item.id" :disabled="item.disabled"
        @mousedown.prevent @click="pick(item)"><OuiIcon v-if="item.icon" :icon="item.icon" :size="16" />{{ item.label }}</button></template>
  </div>
</template>
<style>
.oui-menu { position: fixed; top: 0; left: 0; z-index: 1000; min-width: 176px; padding: 4px; border-radius: var(--oui-radius); background: var(--oui-raised);
  box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-overlay); }
.oui-menu-item { display: flex; align-items: center; gap: var(--oui-s2); width: 100%; min-height: 30px; padding: 4px 8px; border: 0; border-radius: var(--oui-radius-sm);
  font: inherit; color: var(--oui-text); background: none; cursor: pointer; text-align: start; white-space: nowrap; }
.oui-menu-item > .oui-icon { flex: none; color: var(--oui-muted); }
.oui-menu-item:hover, .oui-menu-item:focus-visible { background: var(--oui-control); }
.oui-menu-item:hover > .oui-icon, .oui-menu-item:focus-visible > .oui-icon { color: var(--oui-text); }
.oui-menu-item:disabled { opacity: .45; cursor: not-allowed; }
.oui-menu-item[data-danger], .oui-menu-item[data-danger] > .oui-icon { color: var(--oui-danger); }
.oui-menu-sep { height: 1px; margin: 4px 2px; border: 0; background: var(--oui-border); }
</style>
