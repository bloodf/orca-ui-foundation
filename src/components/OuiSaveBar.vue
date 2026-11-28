<script setup lang="ts">
import { useId } from 'vue';
import Button from 'primevue/button';
import OuiIcon from './OuiIcon.vue';
import OuiStatus from './OuiStatus.vue';
import { save as saveIcon } from '../icons';

/*
 * The save bar of a settings page, for OuiSettings' `#footer`: whether anything is unsaved (and what), Discard and Save.
 * Save and Discard are off while nothing has changed, so the primary button is never live with nothing to save; Save is
 * also off while `invalid` (say why in `reason`) and shows a spinner while `saving`. A page that saves every change as
 * it is made has no use for this: it puts its "Saved" / "Could not save" line in the footer instead.
 * Save emits `save`. With `form` (a form's id) it is that form's submit button instead and emits nothing: the form's own
 * submit handler saves.
 */
export interface OuiSaveBarLabels { /** The chip while something is unsaved ("Unsaved changes"). */ unsaved: string; discard: string; save: string; /** Save's label while saving. */ saving?: string }
defineProps<{ dirty: boolean; labels: OuiSaveBarLabels; saving?: boolean; /** What is unsaved, in a few words ("Printer address, Light"). */ changed?: string;
  /** Something typed cannot be saved: Save is off. */ invalid?: boolean; /** Why Save is off, shown beside the chip and given to Save as its description. */ reason?: string;
  /** The id of the form Save submits. Without it Save is a plain button that emits `save`. */ form?: string }>();
const emit = defineEmits<{ save: []; discard: [] }>();
const whyId = useId();
</script>
<template>
  <span class="oui-savebar-state" role="status"><OuiStatus v-if="dirty" state="pending">{{ labels.unsaved }}</OuiStatus></span>
  <span v-if="reason" :id="whyId" class="oui-meta oui-truncate">{{ reason }}</span>
  <span v-else-if="dirty && changed" class="oui-meta oui-truncate" :title="changed">{{ changed }}</span>
  <span class="oui-spacer" />
  <Button severity="secondary" text :label="labels.discard" :disabled="!dirty || saving" data-test="discard" @click="emit('discard')" />
  <Button :type="form ? 'submit' : 'button'" :form="form" :label="saving ? labels.saving ?? labels.save : labels.save" :loading="saving" :disabled="!dirty || invalid"
    :aria-describedby="reason ? whyId : undefined" data-test="save" @click="form || emit('save')">
    <template #icon><OuiIcon :icon="saveIcon" :size="14" /></template></Button>
</template>
<style>
/* The status region is in the page before its text is, so the text is announced when it comes; empty, it takes no room
   (the footer's gap on both sides of it is taken back). */
.oui-savebar-state { flex: none; display: inline-flex; }
.oui-savebar-state:empty { width: 0; margin-inline-end: calc(-1 * var(--oui-s3)); }
</style>
