import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

/*
 * A state that is only worth showing once it has lasted: true after `on()` has held for `ms()` milliseconds, false the
 * moment it stops. A "waiting…" banner or a loading state that is over in 40 ms then never flashes on and moves the page.
 * No delay (undefined, 0): it follows `on()` at once.
 */
export function useDelayed(on: () => boolean, ms: () => number | undefined): Ref<boolean> {
  const due = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(on, now => {
    clearTimeout(timer);
    const wait = ms() ?? 0;
    if (now && wait > 0) timer = setTimeout(() => { due.value = true; }, wait);
    else due.value = now;
  }, { immediate: true });
  onBeforeUnmount(() => clearTimeout(timer));
  return due;
}
