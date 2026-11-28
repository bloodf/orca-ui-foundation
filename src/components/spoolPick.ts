/*
 * The colour-first spool picker's rules (OuiSpoolPick), with no DOM and no Vue so scripts/spoolPick.test.mjs can run them.
 * Spools are grouped by colour: one group per normalised hex ('#rrggbb', lower case), a multi-colour spool by its set of
 * colours (the same colours in another order are the same group), and every spool without a readable colour in one group.
 * Inside a group the spools run fullest first (remaining grams; unknown last, then by id), so the dialog that picks one
 * of a colour lists them by weight. Groups run light-to-dark greys first, then by hue, then multi-colour, then no colour.
 */
export interface OuiPickSpool {
  id: number | string; name?: string | null; vendor?: string | null; material?: string | null;
  /** One colour, any '#rrggbb'-ish text ('#C12E1F', 'c12e1fff'). */ colour?: string | null;
  /** Every colour of a multi-colour filament; two or more make it multi-colour. */ colours?: string[] | null;
  /** Grams left; null or missing when unknown. */ remaining?: number | null; /** Grams when full. */ initial?: number | null;
  location?: string | null; /** Low on filament: the fill bar turns amber. */ low?: boolean;
}
export interface OuiColourGroup<T extends OuiPickSpool = OuiPickSpool> {
  /** Stable id of the colour: '#rrggbb', the sorted hexes joined with '+', or '' for no colour. */ key: string;
  colour: string | null; /** Multi-colour: the colours as the first spool lists them. */ colours: string[] | null;
  /** Fullest first. */ spools: T[];
}

/** '#rrggbb' in lower case, or '' when the text holds no colour. */
export function normHex(v: unknown): string {
  const m = /^#?([0-9a-f]{6})/i.exec(String(v ?? '').trim());
  return m ? '#' + m[1].toLowerCase() : '';
}

/** The spool's colours: two or more for multi-colour, one, or none. */
export function spoolColours(s: OuiPickSpool): string[] {
  const many = [...new Set((s.colours ?? []).map(normHex).filter(Boolean))];
  if (many.length > 1) return many;
  const one = normHex(s.colour) || many[0];
  return one ? [one] : [];
}

export const colourKey = (s: OuiPickSpool): string => [...spoolColours(s)].sort().join('+');

/** Fullest first; an unknown amount after every known one; then the lower id. */
export function byRemaining(a: OuiPickSpool, b: OuiPickSpool): number {
  const x = typeof a.remaining === 'number' ? a.remaining : -Infinity, y = typeof b.remaining === 'number' ? b.remaining : -Infinity;
  if (x !== y) return y - x;
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

/** Where a group sits: [band, hue, lightness]. Greys (band 0), colours by hue (1), multi-colour (2), no colour (3). */
function place(g: OuiColourGroup): [number, number, number] {
  if (!g.key) return [3, 0, 0];
  if (g.colours) return [2, 0, 0];
  const [r, gr, b] = [1, 3, 5].map(i => parseInt(g.key.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, gr, b), min = Math.min(r, gr, b), d = max - min, l = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (sat < 0.12) return [0, 0, -l];
  const h = max === r ? ((gr - b) / d + 6) % 6 : max === gr ? (b - r) / d + 2 : (r - gr) / d + 4;
  return [1, h, -l];
}

/** Spools grouped by colour, each group fullest first, the groups in palette order. O(n log n) in spools. */
export function groupByColour<T extends OuiPickSpool>(spools: readonly T[]): OuiColourGroup<T>[] {
  const groups = new Map<string, OuiColourGroup<T>>();
  for (const s of spools) {
    const cs = spoolColours(s), key = [...cs].sort().join('+');
    const g = groups.get(key);
    if (g) g.spools.push(s);
    else groups.set(key, { key, colour: cs[0] ?? null, colours: cs.length > 1 ? cs : null, spools: [s] });
  }
  const out = [...groups.values()];
  for (const g of out) g.spools.sort(byRemaining);
  const at = new Map(out.map(g => [g.key, place(g)]));
  return out.sort((a, b) => {
    const p = at.get(a.key)!, q = at.get(b.key)!;
    return p[0] - q[0] || p[1] - q[1] || p[2] - q[2] || a.key.localeCompare(b.key);
  });
}

/** The materials present, for the material filter: trimmed, without blanks, in first-seen order. */
export function materialsOf(spools: readonly OuiPickSpool[]): string[] {
  return [...new Set(spools.map(s => (s.material ?? '').trim()).filter(Boolean))];
}
