<script setup lang="ts">
import { ref, watch } from 'vue';
import OuiIcon from './OuiIcon.vue';
import OuiDetails from './OuiDetails.vue';
import { useDelayed } from './delay';
import { check, error, info, warning, x as close, type OuiIconData } from '../icons';

/*
 * A page-level state, said once: why the page is offline, busy, stale or needs attention, with the one action
 * that resolves it. Controls that it disables point at it with aria-describedby instead of repeating it.
 *
 * Nothing stays on screen for good: with `dismissible` it has a close button. A `dismissKey` remembers the dismissal
 * for the session (a reload of the tab included) under that key; put what the banner is about in the key
 * ("spoolman-down:http://host:7912", "unconfirmed:3") and it comes back when that changes, not on every poll.
 * A banner is bound to its condition, never timed: pass the condition as `show` (instead of v-if) and when it clears
 * the dismissal is forgotten, so the same problem coming back later shows again. A key that changes forgets the old
 * one the same way.
 *
 * `delay` (ms) is for a state that is usually over at once ("Saving: waiting for the plugin…"): the banner only shows
 * once its condition has held that long, so a 40 ms wait never flashes a banner and moves the page down and back.
 * `details` (text, or the `#details` slot) is what helps to report a problem and nobody should have to read: the raw
 * error, a code, a path. It sits closed behind a "Details" disclosure under the message (`detailsLabel`, and
 * `copyLabel` for a Copy button), never in the sentence.
 *
 * The banner reads from the top: the mark, the first line of text, the actions and the close button share the first
 * line, and more text runs on under it. Without actions the close button's room is kept on the first line only, so the
 * lines under it use the banner's whole width (a narrow dock loses no column to it).
 */
const props = withDefaults(defineProps<{ tone?: 'info' | 'warn' | 'error' | 'success' | 'neutral'; title: string; icon?: OuiIconData; id?: string;
  dismissible?: boolean; dismissKey?: string; /** Accessible name of the close button. */ closeLabel?: string;
  /** The banner's condition (default true). False hides it and forgets its dismissal. */ show?: boolean;
  /** Milliseconds the condition has to hold before the banner shows (default 0: at once). */ delay?: number;
  /** Raw technical text, shown closed behind a disclosure. */ details?: string | null; /** The disclosure's name (default "Details"). */ detailsLabel?: string;
  /** Adds a Copy button to the details. */ copyLabel?: string; copiedLabel?: string }>(), { show: true });
const emit = defineEmits<{ dismiss: [] }>();
const TONE = { info: 'info', warn: 'warn', error: 'danger', success: 'success', neutral: 'neutral' } as const;
const ICON: Record<string, OuiIconData> = { info, warn: warning, error, success: check, neutral: info };

const storeKey = (key: string) => 'oui-banner:' + key;
function remembered(key: string | undefined): boolean {
  if (!key) return false;
  try { return sessionStorage.getItem(storeKey(key)) === '1'; } catch { return false; }
}
function forget(key: string | undefined) {
  if (!key) return;
  try { sessionStorage.removeItem(storeKey(key)); } catch { /* nothing stored */ }
}
if (!props.show) forget(props.dismissKey);   // the condition is not there now: a later one starts afresh
const hidden = ref(props.show && remembered(props.dismissKey));
const due = useDelayed(() => props.show, () => props.delay);
watch(() => props.dismissKey, (key, old) => { if (old && old !== key) forget(old); hidden.value = remembered(key); });
watch(() => props.show, (on) => { if (!on) { forget(props.dismissKey); hidden.value = false; } });
function dismiss() {
  hidden.value = true;
  if (props.dismissKey) { try { sessionStorage.setItem(storeKey(props.dismissKey), '1'); } catch { /* remembered until the page reloads */ } }
  emit('dismiss');
}
</script>
<template>
  <div v-if="show && due && !hidden" :id="id" class="oui-banner" :data-dismissible="dismissible ? ($slots.actions ? 'actions' : 'text') : undefined" :data-tone="TONE[props.tone ?? 'info']" :role="props.tone === 'error' ? 'alert' : 'status'">
    <OuiIcon class="oui-banner-icon" :icon="icon ?? ICON[props.tone ?? 'info']" :size="16" :tone="TONE[props.tone ?? 'info']" />
    <p class="oui-banner-text"><strong>{{ title }}</strong> <span v-if="$slots.default"><slot /></span></p>
    <div v-if="$slots.actions" class="oui-banner-actions"><slot name="actions" /></div>
    <OuiDetails v-if="details || $slots.details" class="oui-banner-details" :label="detailsLabel ?? 'Details'" :text="details" :copy-label="copyLabel" :copied-label="copiedLabel"><slot v-if="$slots.details" name="details" /></OuiDetails>
    <button v-if="dismissible" type="button" class="oui-banner-close" :aria-label="closeLabel ?? 'Close'" :title="closeLabel ?? 'Close'" @click="dismiss">
      <OuiIcon :icon="close" :size="14" />
    </button>
  </div>
</template>
<style>
.oui-banner { display: flex; flex-wrap: wrap; align-items: flex-start; align-content: center; gap: 4px 10px; min-height: 36px; padding: 4px 8px 4px 12px; border-radius: var(--oui-radius-lg);
  background: var(--oui-tone-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--oui-tone) 40%, transparent); }
/* Information is not an alarm: an info banner is grey with a blue mark. Warnings, errors and successes are tinted. */
.oui-banner[data-tone='info'] { background: var(--oui-raised); box-shadow: inset 0 0 0 1px var(--oui-border); }
/* Top-aligned: the mark and the actions sit on the first line of the text (18 px line: mark 16, small button 26). */
.oui-banner-icon { margin-top: 4px; }
.oui-banner-text { flex: 1 1 150px; min-width: 0; padding-block: 3px; }
.oui-banner-text > strong { font-weight: 700; margin-inline-end: 4px; }
.oui-banner-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-block: -1px; margin-inline-start: auto; }
.oui-banner-details { flex: 1 0 100%; }
/* The close button keeps the top-right corner however the text and actions wrap. With actions its column is kept free
   (they sit beside it); with text only, just the first line makes room for it and the rest use the whole width. */
.oui-banner[data-dismissible] { position: relative; }
.oui-banner[data-dismissible='actions'] { padding-inline-end: 40px; }
.oui-banner[data-dismissible='text'] > .oui-banner-text::before { content: ''; float: right; width: 30px; height: 18px; }
.oui-banner-close { position: absolute; top: 4px; right: 6px; display: inline-grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: var(--oui-radius);
  color: var(--oui-muted); background: none; cursor: pointer; }
.oui-banner-close:hover { color: var(--oui-text); background: color-mix(in srgb, var(--oui-tone) 14%, transparent); }
</style>
