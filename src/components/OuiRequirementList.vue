<script setup lang="ts">
import { provide } from 'vue';
import OuiIcon from './OuiIcon.vue';
import { OUI_REQ_LIST } from './OuiRequirement.vue';
import { refresh } from '../icons';

/*
 * The requirements of a page as one list with one "Check again": OuiRequirement rows in the default slot (they drop their
 * own button here), a hairline between them, and under them the one button that looks at everything again (`check`).
 */
defineProps<{ checkLabel: string; checking?: boolean; /** Nothing to check against yet. */ disabled?: boolean }>();
const emit = defineEmits<{ check: [] }>();
provide(OUI_REQ_LIST, true);
</script>
<template>
  <div class="oui-reqs">
    <div class="oui-reqs-rows"><slot /></div>
    <div class="oui-reqs-foot">
      <button type="button" class="oui-req-check" :disabled="disabled || checking" data-test="req-check" @click="emit('check')"><OuiIcon :icon="refresh" :size="14" /><span>{{ checkLabel }}</span></button>
    </div>
  </div>
</template>
<style>
.oui-reqs-rows > * + * { border-top: 1px solid var(--oui-border); }
.oui-reqs-foot { display: flex; justify-content: flex-end; padding: var(--oui-s2) var(--oui-s4) var(--oui-s3); border-top: 1px solid var(--oui-border); }
</style>
