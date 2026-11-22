<script setup lang="ts">
import { ref, useId } from 'vue';
import OuiIcon from './OuiIcon.vue';
import OuiStatus from './OuiStatus.vue';
import { check, chevronDown } from '../icons';

/*
 * The OrcaSlicer filament preset a spool or slot is matched to: its name, the score as a state chip (ok when the pick is
 * clear, warn when another preset came close, so it is worth a look), the reasons for the score in one muted line, and
 * Change, which opens the other candidates in place. Picking one emits `pick` with its name; "Automatic" (shown while the
 * match was picked by hand, `remembered`) emits `pick` with null, so the plugin forgets the choice. The plugin words the
 * reasons and the badges ("Remembered", "Spooler") in the page language; filmatch.py gives it the scores and reason codes.
 */
export interface OuiPresetCandidate { name: string; score?: number | null; reasons?: string[]; /** A source or state tag ("Spooler", "OFD, untuned"). */ badge?: string;
  /** One line before the reasons (why it can't be picked, where it comes from). */ note?: string; disabled?: boolean }
export interface OuiPresetMatchLabels { change: string; /** Shown for the name when nothing matched. */ none: string; /** "Score {n}". */ score: string;
  /** The choice that forgets a remembered pick. */ auto?: string; autoHint?: string }
const props = defineProps<{ name?: string | null; score?: number | null; confident?: boolean; reasons?: string[]; badge?: string;
  candidates: OuiPresetCandidate[]; labels: OuiPresetMatchLabels; remembered?: boolean; busy?: boolean }>();
const emit = defineEmits<{ pick: [name: string | null] }>();
const open = ref(false);
const listId = useId();
const scoreText = (n: number) => props.labels.score.replace('{n}', String(n));
function pick(name: string | null) { open.value = false; emit('pick', name); }
</script>
<template>
  <div class="oui-match" :data-open="open || undefined">
    <div class="oui-match-head">
      <div class="oui-match-id">
        <p class="oui-match-name" :data-none="!name || undefined" :title="name ?? undefined">{{ name || labels.none }}</p>
        <p v-if="reasons?.length" class="oui-meta">{{ reasons.join(' · ') }}</p>
      </div>
      <div class="oui-match-side">
        <span v-if="badge" class="oui-chip">{{ badge }}</span>
        <OuiStatus v-if="score != null" :state="confident ? 'ok' : 'warn'">{{ scoreText(score) }}</OuiStatus>
        <button type="button" class="oui-match-change" :aria-expanded="open" :aria-controls="listId" :disabled="busy || (!candidates.length && !remembered)"
          @click="open = !open"><span>{{ labels.change }}</span><OuiIcon :icon="chevronDown" :size="14" /></button>
      </div>
    </div>
    <ul v-if="open" :id="listId" class="oui-match-list">
      <li v-if="remembered && labels.auto">
        <button type="button" class="oui-match-option" :disabled="busy" @click="pick(null)">
          <span class="oui-match-option-name">{{ labels.auto }}</span>
          <span v-if="labels.autoHint" class="oui-meta">{{ labels.autoHint }}</span>
        </button>
      </li>
      <li v-for="c in candidates" :key="c.name">
        <button type="button" class="oui-match-option" :aria-current="c.name === name || undefined" :disabled="busy || c.disabled" @click="pick(c.name)">
          <span class="oui-match-option-name"><OuiIcon v-if="c.name === name" :icon="check" :size="14" /><span class="oui-truncate" :title="c.name">{{ c.name }}</span></span>
          <span class="oui-match-option-side"><span v-if="c.badge" class="oui-chip">{{ c.badge }}</span><span v-if="c.score != null" class="oui-chip oui-num">{{ scoreText(c.score) }}</span></span>
          <span v-if="c.note || c.reasons?.length" class="oui-meta">{{ [c.note, ...(c.reasons ?? [])].filter(Boolean).join(' · ') }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
<style>
.oui-match { display: grid; align-content: start; gap: var(--oui-s2); min-width: 0; }
.oui-match-head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--oui-s2) var(--oui-s3); }
.oui-match-id { flex: 1 1 200px; display: grid; gap: 2px; min-width: 0; }
.oui-match-name { font-weight: 650; overflow-wrap: anywhere; }
.oui-match-name[data-none] { font-weight: 500; color: var(--oui-muted); }
.oui-match-side { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2); margin-inline-start: auto; }
.oui-match-change { display: inline-flex; align-items: center; gap: 6px; height: var(--oui-control-sm); padding: 0 10px; border: 1px solid var(--oui-control-border);
  border-radius: var(--oui-radius); font: inherit; font-weight: 600; color: var(--oui-text); background: var(--oui-surface); cursor: pointer; }
.oui-match-change > .oui-icon { transition: transform .15s var(--oui-ease); }
.oui-match[data-open] .oui-match-change > .oui-icon { transform: rotate(180deg); }
.oui-match-change:hover:not(:disabled) { background: var(--oui-raised); }
.oui-match-change:disabled { opacity: .55; cursor: not-allowed; }
.oui-match-list { display: grid; gap: 2px; margin: 0; padding: 4px; list-style: none; border-radius: var(--oui-radius); background: var(--oui-inset); }
.oui-match-option { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px var(--oui-s2); width: 100%; padding: 6px 8px; border: 0;
  border-radius: var(--oui-radius-sm); font: inherit; color: var(--oui-text); background: none; cursor: pointer; text-align: start; }
.oui-match-option > .oui-meta { grid-column: 1 / -1; }
.oui-match-option:hover:not(:disabled), .oui-match-option:focus-visible { background: var(--oui-control); }
.oui-match-option[aria-current] { background: var(--oui-primary-soft); }
.oui-match-option:disabled { opacity: .55; cursor: not-allowed; }
.oui-match-option-name { display: flex; align-items: center; gap: 6px; min-width: 0; font-weight: 600; }
.oui-match-option-name > .oui-icon { flex: none; color: var(--oui-primary-mark); }
.oui-match-option-side { display: flex; gap: var(--oui-s1); }
</style>
