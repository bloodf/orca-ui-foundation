// The dashboard's layout model (OuiDashboard): widgets on a grid of COLS columns and rows of one height, with gravity
// (every widget rises as far as it can, so there are no holes). Pure functions over plain data: each returns new arrays
// and items, never changes what it was given. scripts/layout.test.mjs runs in `npm run check`.

export const COLS = 12;
/** Most layouts a page keeps, and most characters in a layout's name. */
export const MAX_LAYOUTS = 12;
export const MAX_NAME = 40;
const MAX_ROWS = 200;

export type OuiWidgetValue = string | number | boolean;
/** One setting of a widget, shown in edit mode: a choice among values, or on/off. */
export interface OuiWidgetSetting { key: string; label: string; default: OuiWidgetValue; options?: { value: string | number; label: string }[] }
/** What a widget needs from the grid. Sizes are in columns (of COLS) and rows. `minH` is a number of rows, or a function of
 *  the width for a widget whose content wraps (it needs more rows when it is narrower): see rowsByWidth. */
export interface OuiWidgetSize { w: number; h: number; minW?: number; minH?: number | ((w: number) => number); maxW?: number; maxH?: number }

/** The least height of a widget at a width, in rows. */
export const minHeight = (size: OuiWidgetSize | undefined, w: number) => Math.max(1, Math.ceil(typeof size?.minH === 'function' ? size.minH(w) : size?.minH ?? 1));

/** A least height by width from measured steps, {4: 8, 8: 6, 12: 3}: at a width, the rows of the widest step not above it
 *  (content needs fewer rows as it gets wider, so a width between two steps gets the narrower one's, never too few). */
export function rowsByWidth(steps: Record<number, number>): (w: number) => number {
  const keys = Object.keys(steps).map(Number).sort((a, b) => a - b);
  return w => steps[[...keys].reverse().find(k => k <= w) ?? keys[0]];
}
export interface OuiLayoutItem { id: string; x: number; y: number; w: number; h: number; cfg?: Record<string, OuiWidgetValue> }
export interface OuiLayout { name: string; items: OuiLayoutItem[] }
/** What is saved: the layouts and which one shows. `v` is the format, for a later change of it. */
export interface OuiDashboardState { v: 1; active: number; layouts: OuiLayout[] }
export type OuiSizeOf = (id: string) => OuiWidgetSize | undefined;

const int = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Sizes within the widget's least and most, and the item inside the columns. */
export function fit(item: OuiLayoutItem, size?: OuiWidgetSize, cols = COLS): OuiLayoutItem {
  const minW = clamp(size?.minW ?? 1, 1, cols);
  const w = clamp(item.w, minW, Math.max(minW, Math.min(cols, size?.maxW ?? cols)));
  const minH = minHeight(size, w);
  const h = clamp(item.h, minH, Math.max(minH, size?.maxH ?? MAX_ROWS));
  return { ...item, w, h, x: clamp(item.x, 0, cols - w), y: clamp(item.y, 0, MAX_ROWS) };
}

export const collides = (a: OuiLayoutItem, b: OuiLayoutItem) =>
  a.id !== b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Reading order: by row, then column. The narrow single column shows the widgets in this order. */
export const ordered = (items: readonly OuiLayoutItem[]) => [...items].sort((a, b) => a.y - b.y || a.x - b.x);

/** Gravity: each widget, in reading order, rises until it would overlap one above it. */
export function compact(items: readonly OuiLayoutItem[]): OuiLayoutItem[] {
  const placed: OuiLayoutItem[] = [];
  for (const it of ordered(items)) {
    let y = it.y;
    while (y > 0 && !placed.some(p => collides({ ...it, y: y - 1 }, p))) y--;
    placed.push({ ...it, y });
  }
  return items.map(it => placed.find(p => p.id === it.id)!);
}

/** Overlaps resolved by pushing down: widgets are placed in order (`first` before any other on its row) and each
 *  one that lands on an earlier one goes down until it is free. Then gravity. */
function settle(items: OuiLayoutItem[], first?: string, firstWins = true): OuiLayoutItem[] {
  const order = [...items].sort((a, b) => a.y - b.y || (a.id === first ? (firstWins ? -1 : 1) : b.id === first ? (firstWins ? 1 : -1) : a.x - b.x));
  const placed: OuiLayoutItem[] = [];
  for (const it of order) {
    let y = it.y;
    while (placed.some(p => collides({ ...it, y }, p))) y++;
    placed.push({ ...it, y });
  }
  return compact(items.map(it => placed.find(p => p.id === it.id)!));
}

/** A widget to a new place (columns and rows from the top left); the others make room. */
export function move(items: readonly OuiLayoutItem[], id: string, x: number, y: number, sizeOf?: OuiSizeOf): OuiLayoutItem[] {
  const it = items.find(i => i.id === id);
  if (!it) return [...items];
  const next = fit({ ...it, x, y }, sizeOf?.(id));
  return settle(items.map(i => (i.id === id ? next : i)), id, next.y <= it.y);
}

/** A widget to a new size, its top left at (x, y) when given (a resize from the left or top edge). */
export function resize(items: readonly OuiLayoutItem[], id: string, w: number, h: number, sizeOf?: OuiSizeOf, x?: number, y?: number): OuiLayoutItem[] {
  const it = items.find(i => i.id === id);
  if (!it) return [...items];
  const next = fit({ ...it, w, h, x: x ?? it.x, y: y ?? it.y }, sizeOf?.(id));
  return settle(items.map(i => (i.id === id ? next : i)), id);
}

/** The first place, in reading order, where a widget of this size fits. */
export function freeSpot(items: readonly OuiLayoutItem[], w: number, h: number, cols = COLS): { x: number; y: number } {
  const bottom = items.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x + w <= cols; x++) {
      if (!items.some(i => collides({ id: '\u0000', x, y, w, h }, i))) return { x, y };
    }
  }
  return { x: 0, y: bottom };
}

/** A widget added at its default size in the first place it fits. A widget already there is not added twice. */
export function add(items: readonly OuiLayoutItem[], id: string, size: OuiWidgetSize): OuiLayoutItem[] {
  if (items.some(i => i.id === id)) return [...items];
  const sized = fit({ id, x: 0, y: 0, w: size.w, h: size.h }, size);
  return compact([...items, { ...sized, ...freeSpot(items, sized.w, sized.h) }]);
}

export const remove = (items: readonly OuiLayoutItem[], id: string) => compact(items.filter(i => i.id !== id));

/** A setting's value as stored: one of its options, or of its default's type. */
function cleanValue(s: OuiWidgetSetting, v: unknown): OuiWidgetValue | undefined {
  if (s.options) return s.options.some(o => o.value === v) ? (v as OuiWidgetValue) : undefined;
  return typeof v === typeof s.default ? (v as OuiWidgetValue) : undefined;
}

export interface OuiWidgetSpec extends OuiWidgetSize { id: string; settings?: OuiWidgetSetting[] }

/** One stored layout's widgets: unknown widgets, a second copy, settings that do not exist and values out of range are
 *  dropped; sizes are brought within each widget's least and most and overlaps are resolved. */
export function cleanItems(raw: unknown, specs: readonly OuiWidgetSpec[]): OuiLayoutItem[] {
  if (!Array.isArray(raw)) return [];
  const out: OuiLayoutItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const { id, x, y, w, h, cfg } = r as Record<string, unknown>;
    const spec = specs.find(s => s.id === id);
    if (!spec || out.some(i => i.id === id) || ![x, y, w, h].every(int)) continue;
    const item: OuiLayoutItem = fit({ id: spec.id, x: x as number, y: y as number, w: w as number, h: h as number }, spec);
    if (cfg && typeof cfg === 'object') {
      const kept = Object.fromEntries((spec.settings ?? []).map(s => [s.key, cleanValue(s, (cfg as Record<string, unknown>)[s.key])]).filter(([, v]) => v !== undefined));
      if (Object.keys(kept).length) item.cfg = kept;
    }
    out.push(item);
  }
  return settle(out);
}

const cleanName = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '');

/** What was stored, made safe to show: anything that is not a dashboard (missing, broken, another format) gives the
 *  default; a layout without a name gets one; unknown widgets are dropped (validate per layout, cleanItems). */
export function validate(raw: unknown, specs: readonly OuiWidgetSpec[], defaults: OuiLayout): OuiDashboardState {
  const fallback: OuiDashboardState = { v: 1, active: 0, layouts: [{ name: defaults.name, items: cleanItems(defaults.items, specs) }] };
  if (!raw || typeof raw !== 'object') return fallback;
  const { v, active, layouts } = raw as Record<string, unknown>;
  if (v !== 1 || !Array.isArray(layouts) || !layouts.length) return fallback;
  const names = new Set<string>();
  const kept: OuiLayout[] = [];
  for (const l of layouts.slice(0, MAX_LAYOUTS)) {
    if (!l || typeof l !== 'object') continue;
    let name = cleanName((l as OuiLayout).name) || `${defaults.name} ${kept.length + 1}`;
    for (let n = 2; names.has(name.toLowerCase()); n++) name = `${cleanName((l as OuiLayout).name) || defaults.name} ${n}`;
    names.add(name.toLowerCase());
    kept.push({ name, items: cleanItems((l as OuiLayout).items, specs) });
  }
  if (!kept.length) return fallback;
  return { v: 1, active: int(active) && active >= 0 && active < kept.length ? active : 0, layouts: kept };
}

/** Why a name cannot be used for a layout, or '' when it can. */
export function nameProblem(name: string, layouts: readonly OuiLayout[], except = -1): '' | 'empty' | 'taken' {
  const n = cleanName(name);
  if (!n) return 'empty';
  return layouts.some((l, i) => i !== except && l.name.toLowerCase() === n.toLowerCase()) ? 'taken' : '';
}
export { cleanName };

const sameItems = (a: unknown, b: readonly OuiLayoutItem[]) => Array.isArray(a) && a.length === b.length && b.every(r => a.some(i =>
  !!i && typeof i === 'object' && i.id === r.id && i.x === r.x && i.y === r.y && i.w === r.w && i.h === r.h && !i.cfg));

/** A page that changes its default layout: every stored layout whose widgets are still exactly an earlier default
 *  (`retired`; places and sizes, no settings) was never arranged by the user, so it gets today's default `items`. Every
 *  other layout, and anything that is not a dashboard, is handed back as it was. */
export function replaceRetired(raw: unknown, retired: readonly (readonly OuiLayoutItem[])[], items: readonly OuiLayoutItem[]): unknown {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as OuiDashboardState).layouts)) return raw;
  const layouts = (raw as OuiDashboardState).layouts;
  if (!layouts.some(l => l && retired.some(r => sameItems(l.items, r)))) return raw;
  return { ...raw, layouts: layouts.map(l => (l && retired.some(r => sameItems(l.items, r)) ? { ...l, items: items.map(i => ({ ...i })) } : l)) };
}
