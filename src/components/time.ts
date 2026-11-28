/*
 * When something happened, as people say it: "now", "5 minutes ago", "3 hours ago", "yesterday", "3 days ago" for the
 * last week, and the date alone before that ("Nov 12, 2026"), in the page's language (Intl, no word lists here). For a
 * file list's "modified" column, a "saved" line, a "last seen": the full timestamp belongs in a tooltip.
 * A time that is not a number gives ''; a time ahead of `now` (a printer's clock running fast) reads as now.
 * No DOM and no Vue: scripts/time.test.mjs runs it.
 */
const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

/** `at` and `now` in milliseconds since the epoch; `locale` a language tag (default: the page's `lang`, else the browser's). */
export function relativeTime(at: number | null | undefined, locale?: string, now: number = Date.now()): string {
  if (typeof at !== 'number' || !Number.isFinite(at)) return '';
  const lang = locale ?? (typeof document !== 'undefined' ? document.documentElement.lang : '');
  // A lang that is not a valid tag ("pt_BR") falls back to the browser's instead of throwing.
  const tag = (() => { try { return lang ? Intl.getCanonicalLocales(lang)[0] : undefined; } catch { return undefined; } })();
  const ago = Math.max(0, now - at);
  if (ago >= 7 * DAY) return new Intl.DateTimeFormat(tag, { dateStyle: 'medium' }).format(at);
  const words = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' });
  if (ago < MINUTE) return words.format(0, 'second');
  if (ago < HOUR) return words.format(-Math.floor(ago / MINUTE), 'minute');
  if (ago < DAY) return words.format(-Math.floor(ago / HOUR), 'hour');
  return words.format(-Math.floor(ago / DAY), 'day');
}
