<script setup lang="ts">
import Button from 'primevue/button';
import OuiIcon from './OuiIcon.vue';
import OuiStatus from './OuiStatus.vue';
import { save as saveIcon } from '../icons';

/*
 * The save bar of a settings page, for OuiSettings' `#footer`: whether anything is unsaved (and what), Discard and Save.
 * Save and Discard are off while nothing has changed, so the primary button is never live with nothing to save; Save is
 * also off while `invalid` (say why in `reason`) and shows a spinner while `saving`. A page that saves every change as
 * it is made has no use for this: it puts its "Saved" / "Could not save" line in the footer instead.
 */
export interface OuiSaveBarLabels { /** The chip while something is unsaved ("Unsaved changes"). */ unsaved: string; discard: string; save: string; /** Save's label while saving. */ saving?: string }
defineProps<{ dirty: boolean; labels: OuiSaveBarLabels; saving?: boolean; /** What is unsaved, in a few words ("Printer address, Light"). */ changed?: string;
  /** Something typed cannot be saved: Save is off. */ invalid?: boolean; /** Why Save is off, shown beside the chip and given to Save as its description. */ reason?: string;
  /** Without it Save is a submit button (give `form` the form's id); with a listener for `save`, a plain button. */ form?: string }>();
const emit = defineEmits<{ save: []; discard: [] }>();
</script>
<template>
  <span class="oui-savebar-state" role="status"><OuiStatus v-if="dirty" state="pending">{{ labels.unsaved }}</OuiStatus></span>
  <span v-if="reason" id="oui-savebar-why" class="oui-meta oui-truncate">{{ reason }}</span>
  <span v-else-if="dirty && changed" class="oui-meta oui-truncate" :title="changed">{{ changed }}</span>
  <span class="oui-spacer" />
  <Button severity="secondary" text :label="labels.discard" :disabled="!dirty || saving" data-test="discard" @click="emit('discard')" />
  <Button :type="form ? 'submit' : 'button'" :form="form" :label="saving ? labels.saving ?? labels.save : labels.save" :loading="saving" :disabled="!dirty || invalid"
    :aria-describedby="reason ? 'oui-savebar-why' : undefined" data-test="save" @click="emit('save')">
    <template #icon><OuiIcon :icon="saveIcon" :size="14" /></template></Button>
</template>
<style>
.oui-savebar-state { flex: none; display: inline-flex; }
.oui-savebar-state:empty { display: none; }
</style>
