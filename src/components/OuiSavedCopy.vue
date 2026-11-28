<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue';
import Button from 'primevue/button';
import OuiIcon from './OuiIcon.vue';
import OuiStatus, { type OuiState } from './OuiStatus.vue';
import { copyText } from './clipboard';
import { check, copy as copyIcon, external } from '../icons';

/*
 * The result of a run that saved a copy of the project (Organizer's arranged plate, Embedder's pockets): what was done,
 * when, and the one thing to do next, "Open in OrcaSlicer". One card, the same in every plugin.
 *
 * The title is the project and what happened to it ("Desk organizer · plate 2 arranged"), not the generated file name
 * (that is the title's tooltip, `file`). The folder it was saved in is the plugin's own storage and nobody's business
 * while opening works: the path is not shown. "Copy path" copies it without showing it. The path appears only when the
 * copy has to be found by hand: `failed` (OrcaSlicer could not open it), or when the web view refuses the clipboard
 * (then it is shown selected, for Ctrl/Cmd+C). `status` is the one line about opening ("Asked OrcaSlicer to open the
 * copy."); with `statusState` it is said as a state (a warning for "OrcaSlicer has unsaved changes…"), not as grey text.
 * The run's fine print goes in the default slot.
 * `asked`: the plugin has already asked OrcaSlicer to open the copy, so Open is no longer the step still to do: it is a
 * secondary button (label it "Open again"). `bare`: no card of its own, for inside an OuiPanel. Without
 * `labels.heading` there is no heading line and the title names the section. `openId` is the Open button's id, for a
 * page that moves focus to it when a run ends.
 */
export interface OuiSavedCopyLabels { /** The small heading ("Saved copy"); without it the title is the section's name. */ heading?: string; /** "Open in OrcaSlicer". */ open: string; /** "Copy path". */ copyPath?: string;
  /** On the button for a moment after copying ("Copied"). */ copied?: string; /** Over the path when it shows ("Saved at"). */ path?: string }
const props = defineProps<{ title: string; labels: OuiSavedCopyLabels; /** When ("14:32", "2 min ago"). */ meta?: string; /** The saved file's name: the title's tooltip. */ file?: string;
  path?: string | null; /** Opening failed: show the path. */ failed?: boolean; /** One line about opening. */ status?: string; /** Says the status as a state (mark and colour), wrapping; without it the line is muted text. */ statusState?: OuiState;
  /** Open is under way. */ opening?: boolean; /** Open is off. */ disabled?: boolean; /** OrcaSlicer was already asked to open the copy: Open is a secondary button. */ asked?: boolean;
  /** No padding, background or frame: the card sits inside a panel. */ bare?: boolean; /** The Open button's id. */ openId?: string }>();
const emit = defineEmits<{ open: []; /** After "Copy path": whether the clipboard took it (false: the path is shown, selected). */ copied: [ok: boolean] }>();
const id = useId();
const pathEl = ref<HTMLElement>();
const reveal = ref(false);
const done = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
async function copyPath() {
  if (!props.path) return;
  let ok = await copyText(props.path);
  if (!ok) { reveal.value = true; await nextTick(); ok = await copyText(props.path, pathEl.value); }
  done.value = ok; clearTimeout(timer); timer = setTimeout(() => { done.value = false; }, 2000);
  emit('copied', ok);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <section class="oui-saved" :aria-labelledby="id" :data-failed="failed || undefined" :data-bare="bare || undefined">
    <p v-if="labels.heading" :id="id" class="oui-label">{{ labels.heading }}</p>
    <div class="oui-saved-head">
      <p :id="labels.heading ? undefined : id" class="oui-saved-title" :title="file ?? title">{{ title }}</p>
      <span v-if="meta" class="oui-meta oui-saved-meta">{{ meta }}</span>
    </div>
    <div class="oui-saved-actions">
      <Button :id="openId" :label="labels.open" :severity="asked ? 'secondary' : undefined" :loading="opening" :disabled="disabled" data-test="saved-open" @click="emit('open')"><template #icon><OuiIcon :icon="external" :size="14" /></template></Button>
      <Button v-if="path && labels.copyPath" :label="done && labels.copied ? labels.copied : labels.copyPath" severity="secondary" text size="small" data-test="saved-copy" @click="copyPath">
        <template #icon><OuiIcon :icon="done ? check : copyIcon" :size="14" /></template></Button>
      <slot name="actions" />
    </div>
    <p v-if="status || $slots.status" class="oui-saved-status" role="status"><slot name="status">
      <OuiStatus v-if="statusState" variant="plain" :state="statusState">{{ status }}</OuiStatus><span v-else class="oui-meta">{{ status }}</span></slot></p>
    <div v-if="path && (failed || reveal)" class="oui-saved-where">
      <p v-if="labels.path" class="oui-meta">{{ labels.path }}</p>
      <code ref="pathEl" class="oui-saved-path oui-mono" data-test="saved-path">{{ path }}</code>
    </div>
    <div v-if="$slots.default" class="oui-saved-notes"><slot /></div>
  </section>
</template>
<style>
.oui-saved { container: oui-saved / inline-size; display: grid; gap: var(--oui-s2); min-width: 0; padding: var(--oui-s3); border-radius: var(--oui-radius-lg); background: var(--oui-surface);
  box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-panel); }
.oui-saved-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--oui-s3); min-width: 0; }
.oui-saved-title { flex: 1 1 auto; min-width: 0; font-weight: 650; overflow-wrap: anywhere; }
.oui-saved-meta { flex: none; }
.oui-saved-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s1) var(--oui-s2); min-width: 0; }
/* A long label ("In OrcaSlicer öffnen") wraps inside its button in the dock instead of widening the card. */
.oui-saved-actions > .p-button { max-width: 100%; white-space: normal; }
.oui-saved-actions .p-button-label { flex: 0 1 auto; min-width: 0; overflow-wrap: break-word; }
.oui-saved[data-bare] { padding: 0; border-radius: 0; background: none; box-shadow: none; }
/* The status as a state is a sentence here, not a chip's word: it wraps, its mark on the first line. */
.oui-saved-status > .oui-status { align-items: flex-start; width: auto; white-space: normal; font-weight: 600; }
.oui-saved-status > .oui-status > :first-child { margin-top: 2px; }
.oui-saved-status > .oui-status > .oui-status-dot { margin-top: 5px; }
.oui-saved-status > .oui-status > .oui-status-label { overflow: visible; }
.oui-saved-where { display: grid; gap: 2px; min-width: 0; }
.oui-saved-path { display: block; padding: var(--oui-s2) var(--oui-s3); border-radius: var(--oui-radius); overflow-wrap: anywhere; color: var(--oui-text); background: var(--oui-inset);
  user-select: text; -webkit-user-select: text; }
.oui-saved-notes { display: grid; gap: var(--oui-s1); padding-top: var(--oui-s2); border-top: 1px solid var(--oui-border); font-size: var(--oui-text-sm); color: var(--oui-muted); overflow-wrap: anywhere; }
@container oui-saved (max-width: 240px) { .oui-saved-actions > .p-button:first-child { flex: 1 1 100%; } }
</style>
