<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import OuiIcon from './OuiIcon.vue';
import { copyText } from './clipboard';
import { check, chevronRight, copy as copyIcon } from '../icons';

/*
 * Technical details behind a disclosure: the raw text of an error (an exception, a code, a path) that helps to report a
 * problem and that nobody should have to read to use the page. Closed by default; the message above it says what
 * happened and what to do in plain words. OuiBanner and OuiEmpty show one from their `details`; a page can use it alone.
 * With `copyLabel` it has a Copy button (the clipboard, or where the web view refuses it the text is selected for
 * Ctrl/Cmd+C); `copied` says which.
 */
const props = defineProps<{ /** The disclosure's name ("Technical details"). */ label: string; /** The text; or put it in the default slot. */ text?: string | null;
  copyLabel?: string; /** Shown on the button for a moment after copying. */ copiedLabel?: string; open?: boolean }>();
const emit = defineEmits<{ copied: [ok: boolean] }>();
const body = ref<HTMLElement>();
const done = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
async function copy() {
  const ok = await copyText(props.text ?? body.value?.textContent ?? '', body.value);
  done.value = ok; clearTimeout(timer); timer = setTimeout(() => { done.value = false; }, 2000);
  emit('copied', ok);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <details class="oui-details" :open="open || undefined">
    <summary class="oui-details-summary"><OuiIcon :icon="chevronRight" :size="13" /><span>{{ label }}</span></summary>
    <div class="oui-details-body">
      <div ref="body" class="oui-error-detail oui-details-text"><slot>{{ text }}</slot></div>
      <button v-if="copyLabel" type="button" class="oui-details-copy" @click="copy"><OuiIcon :icon="done ? check : copyIcon" :size="13" /><span aria-live="polite">{{ done && copiedLabel ? copiedLabel : copyLabel }}</span></button>
    </div>
  </details>
</template>
<style>
.oui-details { min-width: 0; text-align: start; }
.oui-details-summary { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 0 6px 0 2px; border-radius: var(--oui-radius); font-size: var(--oui-text-sm); font-weight: 600; color: var(--oui-muted);
  cursor: pointer; list-style: none; user-select: none; -webkit-user-select: none; }
.oui-details-summary::-webkit-details-marker { display: none; }
.oui-details-summary:hover { color: var(--oui-text); }
.oui-details-summary > .oui-icon { transition: transform var(--oui-fast) var(--oui-ease); }
.oui-details[open] > .oui-details-summary > .oui-icon { transform: rotate(90deg); }
.oui-details-body { display: grid; justify-items: start; gap: var(--oui-s2); margin-top: var(--oui-s1); }
.oui-details-text { width: 100%; max-height: 180px; overflow: auto; padding: var(--oui-s2) var(--oui-s3); border-radius: var(--oui-radius); color: var(--oui-text); background: var(--oui-inset);
  user-select: text; -webkit-user-select: text; }
.oui-details-copy { display: inline-flex; align-items: center; gap: 6px; height: var(--oui-control-sm); padding: 0 10px; border: 1px solid var(--oui-control-border); border-radius: var(--oui-radius);
  font: inherit; font-size: var(--oui-text-sm); font-weight: 600; color: var(--oui-text); background: var(--oui-surface); cursor: pointer; }
.oui-details-copy:hover { background: var(--oui-raised); }
</style>
