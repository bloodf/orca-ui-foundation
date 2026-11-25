/*
 * Fuzzy matching for a search box over names ("bnch" finds "benchy_PLA.gcode"). Case and accents do not matter, and
 * '_', '-', '.' and spaces are word breaks that are skipped on both sides, so "benchy pla" finds "benchy_PLA".
 * A lower score is a better match, by tier: the whole name (or the name without its extension), the start of the name,
 * the start of a word, anywhere in a row, then the letters in order with gaps. `hits` are the matched characters'
 * indices in the original name, for highlighting.
 */
export interface FuzzyMatch { score: number; hits: number[] }

const SEPARATOR = /[\s_\-.]/;
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface Prepared { folded: string; text: string; from: number[]; starts: boolean[] }
// A search box asks about the same names on every keystroke: each name is folded once, not once per letter typed.
// ponytail: the whole cache is dropped at 20 000 names instead of evicting the oldest; an LRU if lists ever get that long.
const prepared = new Map<string, Prepared>();

/** The name folded, and folded without separators: its characters, where each came from, and which start a word. */
function prepare(name: string): Prepared {
  const known = prepared.get(name);
  if (known) return known;
  let text = ''; const from: number[] = []; const starts: boolean[] = [];
  let wordStart = true;
  for (let i = 0; i < name.length; i++) {
    const ch = name[i];
    if (SEPARATOR.test(ch)) { wordStart = true; continue; }
    for (const c of fold(ch)) { text += c; from.push(i); starts.push(wordStart); wordStart = false; }
  }
  if (prepared.size >= 20000) prepared.clear();
  const out = { folded: fold(name), text, from, starts };
  prepared.set(name, out);
  return out;
}

export function fuzzyMatch(query: string, name: string): FuzzyMatch | null {
  const q = [...fold(query)].filter(c => !SEPARATOR.test(c)).join('');
  if (!q) return { score: 0, hits: [] };
  const { folded, text, from, starts } = prepare(name);
  const run = (at: number) => from.slice(at, at + q.length);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? prepare(name.slice(0, dot)) : null;
  const typed = fold(query).trim();
  if (folded === typed || base?.folded === typed) return { score: 0, hits: run(0) };
  if (text === q || base?.text === q) return { score: 500, hits: run(0) };   // the same but for separators: "benchy pla" for "benchy_PLA
  if (text.startsWith(q)) return { score: 1000 + text.length, hits: run(0) };
  let at = text.indexOf(q); let first = at;
  for (; at >= 0; at = text.indexOf(q, at + 1)) if (starts[at]) return { score: 2000 + at, hits: run(at) };
  if (first >= 0) return { score: 3000 + first, hits: run(first) };
  // In order with gaps: each letter at the next word start where there is one (so "bp" is Benchy_PLA), else the next match;
  // if preferring word starts runs out of letters, plainly the next match.
  // ponytail: two greedy passes, not an optimal alignment; swap for a DP if long names rank oddly.
  const walk = (words: boolean) => {
    const hits: number[] = []; let pos = 0; let atStarts = 0;
    for (const c of q) {
      let plain = -1; let word = -1;
      for (let i = pos; i < text.length; i++) if (text[i] === c) { if (plain < 0) plain = i; if (starts[i]) { word = i; break; } }
      const pick = words && word >= 0 ? word : plain;
      if (pick < 0) return null;
      if (starts[pick]) atStarts++;
      hits.push(pick); pos = pick + 1;
    }
    return { hits, atStarts };
  };
  const found = walk(true) ?? walk(false);
  if (!found) return null;
  const hits = found.hits.map(i => from[i]); const atStarts = found.atStarts;
  const span = found.hits[found.hits.length - 1] - found.hits[0];
  return { score: 4000 + span * 4 - atStarts * 8 + found.hits[0], hits };
}

/** The items that match, best first (ties keep their order), each with its match. Everything, unranked, for an empty query. */
export function fuzzyFilter<T>(items: T[], query: string, nameOf: (item: T) => string): { item: T; match: FuzzyMatch }[] {
  const out: { item: T; match: FuzzyMatch; i: number }[] = [];
  items.forEach((item, i) => { const match = fuzzyMatch(query, nameOf(item)); if (match) out.push({ item, match, i }); });
  return out.sort((a, b) => a.match.score - b.match.score || a.i - b.i).map(({ item, match }) => ({ item, match }));
}
