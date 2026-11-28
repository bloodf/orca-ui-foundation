<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import OuiIcon from './OuiIcon.vue';
import { check, chevronDown, warning } from '../icons';
import { presetDisplayName } from './presetName';

/*
 * The OrcaSlicer filament preset a spool or slot is matched to: its name and Change, which opens the other candidates in
 * place as a plain list of names with a tick on the current one. Picking one emits `pick` with its (real, unshortened)
 * name; "Automatic" (shown while the match was picked by hand, `remembered`) emits `pick` with null, so the plugin forgets
 * the choice.
 *
 * How the match was made is the plugin's business, not the page's: no score, no reasons and no source tags are drawn.
 * When the plugin is not sure of its pick (`confident` false and `labels.review` given) a small warning mark sits beside
 * the name, with that sentence as its tooltip and accessible name; nothing else.
 * Names are shown as people know them (presetDisplayName): without a plugin's internal prefix ("_local/spooler/",
 * "Spooler/") and without the " @printer" part, which the page already says. Two candidates that would then read the
 * same keep their printer. The tooltip has the name with its printer.
 *
 * `inline` is the one-line form for a card that has no room for a label, a name and a button on three lines: the name
 * itself is the Change trigger, with a chevron, and is cut with an ellipsis when it is long.
 *
 * Up to 5.13 this drew `score` as a chip, `reasons` as a line and `badge` as a tag, on the match and on every candidate
 * (and a candidate's `note`). Those props are still accepted, so a page written for 5.13 builds, and are ignored;
 * a candidate's `note` is only the tooltip of a candidate that cannot be picked.
 */
export interface OuiPresetCandidate { name: string; disabled?: boolean; /** Why a disabled candidate cannot be picked: its tooltip. */ note?: string;
  /** @deprecated 5.14: not shown. */ score?: number | null; /** @deprecated 5.14: not shown. */ reasons?: string[]; /** @deprecated 5.14: not shown. */ badge?: string }
export interface OuiPresetMatchLabels { change: string; /** Shown for the name when nothing matched. */ none: string;
  /** The warning mark's tooltip when the pick is not a sure one ("Another preset is a close match. Worth a look."). Without it there is no mark. */ review?: string;
  /** The choice that forgets a remembered pick. */ auto?: string; autoHint?: string; /** @deprecated 5.14: not shown. */ score?: string }
const props = withDefaults(defineProps<{ name?: string | null; /** False: the pick is not a sure one (with `labels.review`, a warning mark). */ confident?: boolean;
  candidates: OuiPresetCandidate[]; labels: OuiPresetMatchLabels; remembered?: boolean; busy?: boolean; /** One line: the name is the Change trigger. */ inline?: boolean;
  /** @deprecated 5.14: not shown. */ score?: number | null; /** @deprecated 5.14: not shown. */ reasons?: string[]; /** @deprecated 5.14: not shown. */ badge?: string }>(), { confident: undefined });
const emit = defineEmits<{ pick: [name: string | null] }>();
const open = ref(false);
const listId = useId();
function pick(name: string | null) { open.value = false; emit('pick', name); }
const unsure = computed(() => !!props.name && props.confident === false && !!props.labels.review);
// Candidates by the name shown; those that would read the same keep their printer.
const options = computed(() => {
  const short = props.candidates.map(c => presetDisplayName(c.name));
  return props.candidates.map((c, i) => ({ ...c, shown: short.indexOf(short[i]) !== short.lastIndexOf(short[i]) ? presetDisplayName(c.name, true) : short[i], full: presetDisplayName(c.name, true) }));
});
</script>
<template>
  <div class="oui-match" :data-open="open || undefined" :data-inline="inline || undefined">
    <button v-if="inline" type="button" class="oui-match-change oui-match-trigger" :aria-expanded="open" :aria-controls="listId" :disabled="busy || (!candidates.length && !remembered)"
      :aria-label="[labels.change + ': ' + (name ? presetDisplayName(name) : labels.none), unsure ? labels.review : ''].filter(Boolean).join(', ')" :title="name ? presetDisplayName(name, true) : undefined" @click="open = !open">
      <span class="oui-truncate" :data-none="!name || undefined">{{ name ? presetDisplayName(name) : labels.none }}</span>
      <span v-if="unsure" class="oui-match-unsure" :title="labels.review"><OuiIcon :icon="warning" :size="14" /></span>
      <OuiIcon class="oui-match-chevron" :icon="chevronDown" :size="14" />
    </button>
    <div v-else class="oui-match-head">
      <p class="oui-match-name" :data-none="!name || undefined" :title="name ? presetDisplayName(name, true) : undefined">
        <span>{{ name ? presetDisplayName(name) : labels.none }}</span>
        <span v-if="unsure" class="oui-match-unsure" role="img" :aria-label="labels.review" :title="labels.review"><OuiIcon :icon="warning" :size="14" /></span>
      </p>
      <button type="button" class="oui-match-change" :aria-expanded="open" :aria-controls="listId" :disabled="busy || (!candidates.length && !remembered)"
        @click="open = !open"><span>{{ labels.change }}</span><OuiIcon class="oui-match-chevron" :icon="chevronDown" :size="14" /></button>
    </div>
    <ul v-if="open" :id="listId" class="oui-match-list">
      <li v-if="remembered && labels.auto">
        <button type="button" class="oui-match-option" :disabled="busy" @click="pick(null)">
          <span class="oui-match-option-name">{{ labels.auto }}</span>
          <span v-if="labels.autoHint" class="oui-meta">{{ labels.autoHint }}</span>
        </button>
      </li>
      <li v-for="c in options" :key="c.name">
        <button type="button" class="oui-match-option" :aria-current="c.name === name || undefined" :disabled="busy || c.disabled" :title="c.disabled && c.note ? c.note : c.full" @click="pick(c.name)">
          <span class="oui-match-option-name"><OuiIcon v-if="c.name === name" :icon="check" :size="14" /><span class="oui-truncate">{{ c.shown }}</span></span>
        </button>
      </li>
    </ul>
  </div>
</template>
<style>
/* As wide as the row it is in: in a form row (a flex line) it takes the whole line, so the open list spans it. */
.oui-match { flex: 1 1 100%; display: grid; align-content: start; gap: var(--oui-s2); min-width: 0; }
.oui-match-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2) var(--oui-s3); }
.oui-match-name { flex: 1 1 160px; display: flex; align-items: center; gap: 6px; min-width: 0; font-weight: 650; overflow-wrap: anywhere; }
.oui-match-name[data-none] { font-weight: 500; color: var(--oui-muted); }
.oui-match-unsure { flex: none; display: inline-grid; place-items: center; color: var(--oui-warning); cursor: help; }
.oui-match-change { flex: none; display: inline-flex; align-items: center; gap: 6px; height: var(--oui-control-sm); margin-inline-start: auto; padding: 0 10px; border: 1px solid var(--oui-control-border);
  border-radius: var(--oui-radius); font: inherit; font-weight: 600; color: var(--oui-text); background: var(--oui-surface); cursor: pointer; }
.oui-match-chevron { flex: none; transition: transform .15s var(--oui-ease); }
.oui-match[data-open] .oui-match-chevron { transform: rotate(180deg); }
/* Inline: the name is the trigger. No frame until it is pointed at; it starts where the card's other text starts. */
.oui-match-trigger { justify-self: start; max-width: 100%; min-width: 0; margin-inline: -6px 0; padding: 0 6px; border-color: transparent; font-weight: 650; background: none; }
.oui-match-trigger > [data-none] { font-weight: 500; color: var(--oui-muted); }
.oui-match-trigger > .oui-match-chevron { color: var(--oui-muted); }
.oui-match-change:hover:not(:disabled) { background: var(--oui-raised); }
.oui-match-change:disabled { opacity: .55; cursor: not-allowed; }
.oui-match-list { display: grid; gap: 2px; margin: 0; padding: 4px; list-style: none; border-radius: var(--oui-radius); background: var(--oui-inset); }
.oui-match-option { display: grid; gap: 2px; width: 100%; padding: 6px 8px; border: 0;
  border-radius: var(--oui-radius-sm); font: inherit; color: var(--oui-text); background: none; cursor: pointer; text-align: start; }
.oui-match-option:hover:not(:disabled), .oui-match-option:focus-visible { background: var(--oui-control); }
.oui-match-option[aria-current] { background: var(--oui-primary-soft); }
.oui-match-option:disabled { opacity: .55; cursor: not-allowed; }
.oui-match-option-name { display: flex; align-items: center; gap: 6px; min-width: 0; font-weight: 600; }
.oui-match-option-name > .oui-icon { flex: none; color: var(--oui-primary-mark); }
</style>
