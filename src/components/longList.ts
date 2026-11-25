/*
 * virtualScrollerOptions for a PrimeVue Select, MultiSelect or Listbox whose options can run into the thousands (spools,
 * filament presets): past LONG_LIST options only the rows in view are drawn, each exactly `itemSize` px tall, so opening
 * 2000 spools costs what opening 20 does. A shorter list keeps the plain list and its natural height (the virtual one is
 * always scrollHeight tall).
 *   <Select :options="spools" :virtual-scroller-options="longList(spools.length, 38)" ... />
 * Count group headers too for a grouped Select: each one is a row.
 */
export const LONG_LIST = 50;
export const longList = (count: number, itemSize: number) => (count > LONG_LIST ? { itemSize } : undefined);
