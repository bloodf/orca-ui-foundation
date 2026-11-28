/*
 * A filament preset's name as people know it. OrcaSlicer's preset names carry two things a page should not show as the
 * name: where a plugin keeps the preset ("_local/spooler/PLA Matte - Black @X1", "Spooler/PLA Matte - Black @U1") and the
 * printer it is made for (" @BBL X1C", " @Snapmaker U1 0.4 nozzle"). The page already says which printer it is about, so
 * the name is the part before both. No DOM and no Vue: scripts/presetName.test.mjs runs it.
 */
const INTERNAL = /^(?:_local\/[^/]+\/|Spooler\/)+/i;

/** The name to show for a preset. `keepPrinter` leaves the " @printer" part (a tooltip, or two presets that would
 *  otherwise read the same). A name with nothing left after stripping is returned as it is. */
export function presetDisplayName(name: string | null | undefined, keepPrinter = false): string {
  const full = String(name ?? '').trim();
  const own = full.replace(INTERNAL, '').trim();
  const short = keepPrinter ? own : own.replace(/\s+@[^@]*$/, '').trim();
  return short || own || full;
}
