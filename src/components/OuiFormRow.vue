<script setup lang="ts">
/*
 * A setting: label (and at most one short hint) on the left, its control on the right. Rows share the label
 * column and every control starts at the same left edge, whatever it is: a field, a select, a switch, a radio group, a
 * button. A number field is 220 px wide and a select 220 to 340 px (as its longest name needs), not as wide as the
 * panel; a text field takes the room there is, and so does a select or number field marked `fluid`. In a narrow section
 * the control drops under the label.
 */
defineProps<{ label: string; for?: string; hint?: string; error?: string; /** Control under the label: for wide controls (paths, lists). */ stacked?: boolean;
  /** The control at the row's right edge instead (how every row was up to 5.13): for a lone action button. */ end?: boolean }>();
</script>
<template>
  <div class="oui-formrow" :data-stacked="stacked || undefined" :data-end="end || undefined" :data-invalid="error ? true : undefined">
    <div class="oui-formrow-label">
      <label v-if="for" :for="for">{{ label }}</label><span v-else>{{ label }}</span>
      <p v-if="hint" class="oui-meta">{{ hint }}</p>
    </div>
    <div class="oui-formrow-control"><slot /><p v-if="error" class="oui-formrow-error" role="alert">{{ error }}</p></div>
  </div>
</template>
<style>
.oui-formrow { display: grid; grid-template-columns: minmax(140px, 2fr) minmax(0, 3fr); align-items: center; gap: var(--oui-s1) var(--oui-s4);
  min-height: 48px; padding: var(--oui-s2) var(--oui-s4); }
.oui-formrow-label { display: grid; gap: 1px; min-width: 0; }
.oui-formrow-label > :first-child { font-weight: 600; }
.oui-formrow-control { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: var(--oui-s2); min-width: 0; }
.oui-formrow-control > :where(.p-inputtext, .p-password) { flex: 1 1 160px; min-width: 0; max-width: 100%; }
.oui-formrow-control > :where(.p-inputnumber) { flex: 0 1 220px; min-width: 0; max-width: 100%; }
.oui-formrow-control > :where(.p-select) { flex: 1 1 220px; min-width: 0; max-width: min(100%, 340px); }
.oui-formrow-control > :where(.p-select-fluid, .p-inputnumber-fluid) { flex: 1 1 160px; max-width: 100%; }
.oui-formrow-error { flex: 1 0 100%; font-size: var(--oui-text-sm); color: var(--oui-danger); }
.oui-formrow[data-end] .oui-formrow-control { justify-content: flex-end; }
.oui-formrow[data-end] .oui-formrow-error { text-align: end; }
.oui-formrow[data-stacked] { grid-template-columns: minmax(0, 1fr); }
.oui-formrow[data-stacked] .oui-formrow-control { justify-content: flex-start; }
@container oui-form (max-width: 420px) {
  .oui-formrow { grid-template-columns: minmax(0, 1fr); }
  .oui-formrow:is([data-end], :not([data-end])) .oui-formrow-control { justify-content: flex-start; }
  .oui-formrow:is([data-end], :not([data-end])) .oui-formrow-error { text-align: start; }
}
</style>
