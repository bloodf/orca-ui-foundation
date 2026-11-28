<script setup lang="ts">
import OuiIcon from './OuiIcon.vue';
import OuiDetails from './OuiDetails.vue';
import { useDelayed } from './delay';
import { box, error, offline, type OuiIconData } from '../icons';
import type { OuiTone } from './tones';

/* Nothing to show, and why: empty, loading, error or offline. One sentence and, when there is one, the way out.
   Centred in its place, as a block or (`compact`) as one row. `delay` (ms) holds it back until it has lasted that long, so
   a loading state that is over at once never flashes. `details` (text, or the `#details` slot) is the raw error behind a
   closed "Details" disclosure (`detailsLabel`, `copyLabel`), never in the sentence. */
const props = defineProps<{ title: string; text?: string; icon?: OuiIconData; tone?: OuiTone; /** An illustration in place of the icon tile (first run, an empty page). Decorative. */ image?: string; state?: 'empty' | 'loading' | 'error' | 'offline'; compact?: boolean;
  /** Milliseconds before it shows (default 0: at once). */ delay?: number;
  /** Raw technical text, shown closed behind a disclosure. */ details?: string | null; detailsLabel?: string; copyLabel?: string; copiedLabel?: string }>();
const due = useDelayed(() => true, () => props.delay);
const ICON: Record<string, OuiIconData> = { empty: box, error, offline };
</script>
<template>
  <div v-if="due" class="oui-empty" :data-state="state ?? 'empty'" :data-compact="compact || undefined" :role="state === 'error' ? 'alert' : undefined"
    :aria-busy="state === 'loading' || undefined">
    <img v-if="image && state !== 'loading'" class="oui-empty-image" :src="image" alt="" width="144" height="144" draggable="false">
    <span v-else-if="state === 'loading'" class="oui-empty-mark"><span class="oui-empty-spin" /></span>
    <OuiIcon v-else tile :tone="state === 'error' ? 'danger' : state === 'offline' ? 'neutral' : tone ?? 'neutral'" :icon="icon ?? ICON[state ?? 'empty']" :size="compact ? 18 : 22" />
    <div class="oui-empty-text"><p class="oui-strong">{{ title }}</p><p v-if="text || $slots.default" class="oui-meta"><slot>{{ text }}</slot></p></div>
    <div v-if="$slots.actions" class="oui-row"><slot name="actions" /></div>
    <OuiDetails v-if="details || $slots.details" class="oui-empty-details" :label="detailsLabel ?? 'Details'" :text="details" :copy-label="copyLabel" :copied-label="copiedLabel"><slot v-if="$slots.details" name="details" /></OuiDetails>
  </div>
</template>
<style>
.oui-empty { display: grid; justify-items: center; align-content: center; gap: var(--oui-s3); padding: var(--oui-s6) var(--oui-s4); text-align: center; min-height: 100%; }
.oui-empty-text { display: grid; gap: 2px; max-width: 44ch; }
.oui-empty-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--oui-radius); color: var(--oui-muted); background: var(--oui-raised); }
.oui-empty-image { display: block; width: 144px; height: 144px; object-fit: contain; }
.oui-empty[data-compact] .oui-empty-image { width: 56px; height: 56px; }
.oui-empty .oui-strong { font-weight: 700; }
.oui-empty-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: oui-turn .9s linear infinite; }
/* Compact: one row (mark, text, actions), centred in its place like the block form; the text reads from its start. */
.oui-empty[data-compact] { grid-template-columns: auto minmax(0, auto) auto; justify-content: center; align-items: center; justify-items: start; text-align: start; padding: var(--oui-s3) var(--oui-s4); gap: var(--oui-s3); }
.oui-empty > .oui-empty-details { width: 100%; max-width: 60ch; text-align: center; }
.oui-empty[data-compact] > .oui-empty-details { grid-column: 1 / -1; text-align: start; }
.oui-empty[data-compact] .oui-empty-mark { width: 30px; height: 30px; }
</style>
