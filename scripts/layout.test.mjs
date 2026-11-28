// Unit tests of the dashboard's layout model (src/components/layout.ts): node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, add, cleanItems, collides, compact, fit, freeSpot, minHeight, move, nameProblem, ordered, packTops, remove, replaceRetired, resize, rowsByWidth, validate } from '../src/components/layout.ts';

const SPECS = [
  { id: 'job', w: 12, h: 3, minW: 4, minH: 2 },
  { id: 'cam', w: 4, h: 6, minW: 3, minH: 4, maxH: 12, settings: [{ key: 'aspect', label: 'Aspect', default: '16/9', options: [{ value: '16/9', label: '16:9' }, { value: '4/3', label: '4:3' }] }] },
  { id: 'log', w: 8, h: 6, minW: 3, minH: 3, settings: [{ key: 'lines', label: 'Lines', default: 200, options: [{ value: 100, label: '100' }, { value: 200, label: '200' }] }, { key: 'wrap', label: 'Wrap', default: true }] },
];
const sizeOf = id => SPECS.find(s => s.id === id);
const at = (items, id) => { const i = items.find(x => x.id === id); return [i.x, i.y, i.w, i.h]; };
const overlapFree = items => items.every(a => items.every(b => !collides(a, b)));
const BASE = [{ id: 'job', x: 0, y: 0, w: 12, h: 3 }, { id: 'log', x: 0, y: 3, w: 8, h: 6 }, { id: 'cam', x: 8, y: 3, w: 4, h: 6 }];

test('fit keeps a widget inside the columns and within its least and most size', () => {
  assert.deepEqual(fit({ id: 'cam', x: 11, y: -2, w: 1, h: 40 }, sizeOf('cam')), { id: 'cam', x: 9, y: 0, w: 3, h: 12 });
  assert.deepEqual(fit({ id: 'job', x: 0, y: 0, w: 20, h: 1 }, sizeOf('job')), { id: 'job', x: 0, y: 0, w: COLS, h: 2 });
});

test('compact lifts every widget as far as it goes, keeping columns and order', () => {
  const out = compact([{ id: 'a', x: 0, y: 5, w: 6, h: 2 }, { id: 'b', x: 6, y: 9, w: 6, h: 2 }, { id: 'c', x: 0, y: 10, w: 12, h: 1 }]);
  assert.deepEqual(out.map(i => [i.id, i.y]), [['a', 0], ['b', 0], ['c', 2]]);
});

test('move places a widget and pushes what it lands on down, with no overlaps', () => {
  const out = move(BASE, 'cam', 0, 0, sizeOf);
  assert.deepEqual(at(out, 'cam'), [0, 0, 4, 6]);
  assert.deepEqual(at(out, 'job'), [0, 6, 12, 3]);
  assert.ok(overlapFree(out));
  assert.deepEqual(at(BASE, 'cam'), [8, 3, 4, 6], 'the input is not changed');
});

test('moving down past a widget swaps their order; a small nudge does not', () => {
  assert.deepEqual(at(move(BASE, 'job', 0, 1, sizeOf), 'job'), [0, 0, 12, 3], 'gravity takes it back');
  const out = move(BASE, 'job', 0, 5, sizeOf);
  assert.deepEqual([at(out, 'log')[1], at(out, 'job')[1]], [0, 6]);
  assert.ok(overlapFree(out));
});

test('move clamps to the grid', () => {
  assert.deepEqual(at(move(BASE, 'cam', 30, -4, sizeOf), 'cam').slice(0, 2), [8, 0]);
});

test('resize snaps within limits and makes room below', () => {
  let out = resize(BASE, 'log', 12, 8, sizeOf);
  assert.deepEqual(at(out, 'log'), [0, 3, 12, 8]);
  assert.deepEqual(at(out, 'cam'), [8, 11, 4, 6]);
  assert.ok(overlapFree(out));
  out = resize(BASE, 'cam', 1, 99, sizeOf);
  assert.deepEqual(at(out, 'cam'), [8, 3, 3, 12], 'least width 3, most height 12');
  out = resize(BASE, 'cam', 6, 6, sizeOf, 6, 3);   // from the left edge: x moves with the width
  assert.deepEqual(at(out, 'cam'), [6, 3, 6, 6]);
  assert.ok(overlapFree(out));
});

test('add uses the first free place, never a second copy; remove closes the gap', () => {
  const two = remove(BASE, 'cam');
  assert.deepEqual(freeSpot(two, 4, 6), { x: 8, y: 3 });
  const back = add(two, 'cam', sizeOf('cam'));
  assert.deepEqual(at(back, 'cam'), [8, 3, 4, 6]);
  assert.equal(add(back, 'cam', sizeOf('cam')).length, 3);
  assert.deepEqual(at(remove(BASE, 'job'), 'log'), [0, 0, 8, 6]);
});

test('reading order is by row then column', () => {
  assert.deepEqual(ordered(move(BASE, 'cam', 0, 0, sizeOf)).map(i => i.id), ['cam', 'job', 'log']);
});

test('cleanItems drops unknown widgets, copies, bad numbers and unknown settings, and resolves overlaps', () => {
  const out = cleanItems([
    { id: 'job', x: 0, y: 0, w: 12, h: 3 }, { id: 'ghost', x: 0, y: 0, w: 2, h: 2 }, { id: 'job', x: 0, y: 9, w: 4, h: 4 },
    { id: 'cam', x: 0, y: 0, w: 4, h: 6, cfg: { aspect: '4/3', nope: 1 } }, { id: 'log', x: 'a', y: 0, w: 1, h: 1 }, null, 7,
  ], SPECS);
  assert.deepEqual(out.map(i => i.id), ['job', 'cam']);
  assert.deepEqual(out.find(i => i.id === 'cam').cfg, { aspect: '4/3' });
  assert.ok(overlapFree(out));
  const cfg = cleanItems([{ id: 'log', x: 0, y: 0, w: 8, h: 6, cfg: { lines: 999, wrap: 'yes' } }], SPECS)[0];
  assert.equal(cfg.cfg, undefined, 'values out of range are dropped, the defaults apply');
});

test('validate falls back to the default for anything that is not a stored dashboard', () => {
  const def = { name: 'Default', items: BASE };
  for (const raw of [null, 'x', 5, [], {}, { v: 2, layouts: [] }, { v: 1, layouts: [] }, { v: 1, layouts: [null, 3] }]) {
    const st = validate(raw, SPECS, def);
    assert.equal(st.layouts.length, 1);
    assert.equal(st.layouts[0].name, 'Default');
    assert.deepEqual(st.layouts[0].items, BASE);
  }
});

test('validate keeps good layouts, names them uniquely and keeps the active one in range', () => {
  const st = validate({ v: 1, active: 5, layouts: [{ name: '  Print  ', items: BASE }, { name: 'print', items: [{ id: 'log', x: 0, y: 0, w: 8, h: 6 }] }, { items: [] }] },
    SPECS, { name: 'Default', items: BASE });
  assert.deepEqual(st.layouts.map(l => l.name), ['Print', 'print 2', 'Default 3']);
  assert.equal(st.active, 0);
  assert.equal(validate({ v: 1, active: 1, layouts: [{ name: 'a', items: [] }, { name: 'b', items: [] }] }, SPECS, { name: 'D', items: [] }).active, 1);
  assert.equal(validate({ v: 1, active: 2, layouts: [null, { name: 'a', items: [] }, { name: 'b', items: [] }] }, SPECS, { name: 'D', items: [] }).active, 1,
    'a dropped broken layout does not move which one is open');
  const round = validate(JSON.parse(JSON.stringify(st)), SPECS, { name: 'Default', items: BASE });
  assert.deepEqual(round, st, 'a saved dashboard reads back the same');
});

test('nameProblem refuses empty names and a name in use (any case), except the layout being renamed', () => {
  const ls = [{ name: 'Print', items: [] }, { name: 'Camera', items: [] }];
  assert.equal(nameProblem('  ', ls), 'empty');
  assert.equal(nameProblem('camera', ls), 'taken');
  assert.equal(nameProblem('Camera', ls, 1), '');
  assert.equal(nameProblem('Night', ls), '');
});

test('a least height by width: narrower needs more rows when resizing; a stored size keeps its rows', () => {
  const byW = rowsByWidth({ 4: 8, 8: 5, 12: 3 });
  assert.deepEqual([3, 4, 7, 8, 11, 12].map(byW), [8, 8, 8, 5, 5, 3], 'below the first step its rows, between steps the narrower one');
  const job = { id: 'job', w: 12, h: 3, minW: 4, minH: byW };
  assert.equal(minHeight(job, 6), 8);
  assert.equal(minHeight({ w: 1, h: 1, minH: 2.2 }, 3), 3, 'whole rows');
  const sizeOf2 = id => (id === 'job' ? job : sizeOf(id));
  const items = [{ id: 'job', x: 0, y: 0, w: 12, h: 3 }, { id: 'log', x: 0, y: 3, w: 8, h: 6 }];
  assert.deepEqual(at(resize(items, 'job', 8, 3, sizeOf2), 'job'), [0, 0, 8, 5], 'narrower: taller');
  assert.deepEqual(at(resize(items, 'job', 12, 1, sizeOf2), 'job'), [0, 0, 12, 3], 'full width: its own least');
  assert.deepEqual(cleanItems([{ id: 'job', x: 0, y: 0, w: 4, h: 3 }], [job])[0].h, 3, 'a stored size keeps its rows (only resizing applies it)');
});

test('a layout still exactly as an earlier default gets the new default; arranged layouts and broken data stay as they are', () => {
  const OLD = [{ id: 'job', x: 0, y: 0, w: 12, h: 3 }, { id: 'log', x: 0, y: 3, w: 8, h: 6 }];
  const NEW = [{ id: 'job', x: 0, y: 0, w: 12, h: 3 }, { id: 'cam', x: 0, y: 3, w: 4, h: 6 }];
  const mine = [{ id: 'job', x: 0, y: 0, w: 12, h: 3 }, { id: 'log', x: 0, y: 3, w: 8, h: 7 }];
  const raw = { v: 1, active: 1, layouts: [{ name: 'Default', items: [OLD[1], OLD[0]] }, { name: 'Mine', items: mine },
    { name: 'Set', items: [OLD[0], { ...OLD[1], cfg: { lines: 100 } }] }] };
  const out = replaceRetired(raw, [OLD], NEW);
  assert.deepEqual(out.layouts.map(l => l.items), [NEW, mine, raw.layouts[2].items], 'only the untouched default changes (order does not matter; a setting is a change)');
  assert.equal(out.active, 1);
  assert.equal(raw.layouts[0].items[0], OLD[1], 'the stored value is not changed');
  for (const x of [undefined, null, 'x', { v: 1 }]) assert.equal(replaceRetired(x, [OLD], NEW), x);
  const kept = { v: 1, active: 0, layouts: [{ name: 'Mine', items: mine }] };
  assert.equal(replaceRetired(kept, [OLD], NEW), kept, 'nothing to replace: the same object');
});

test('packTops packs every column on its own: a tall card moves only what is under it', () => {
  // job across the top; a tall card on the left; two short ones stacked on the right; a full-width card under both.
  const items = [{ id: 'job', x: 0, y: 0, w: 12, h: 2 }, { id: 'tall', x: 0, y: 2, w: 7, h: 8 }, { id: 'a', x: 7, y: 2, w: 5, h: 4 }, { id: 'b', x: 7, y: 6, w: 5, h: 4 }, { id: 'foot', x: 0, y: 10, w: 12, h: 2 }];
  const px = { job: 100, tall: 900, a: 60, b: 200, foot: 50 };
  const tops = packTops(items, it => px[it.id], 12);
  assert.deepEqual(tops, { job: 0, tall: 112, a: 112, b: 184, foot: 1024 });
  // The same layout with a short left card: the right column does not change, the foot rises to the taller column.
  assert.deepEqual(packTops(items, it => ({ ...px, tall: 80 })[it.id], 12), { job: 0, tall: 112, a: 112, b: 184, foot: 396 });
  // Order given does not matter, and a widget that shares no column with any other starts at the top.
  assert.deepEqual(packTops([{ id: 'r', x: 6, y: 5, w: 6, h: 1 }, { id: 'l', x: 0, y: 0, w: 6, h: 9 }], () => 40, 12), { l: 0, r: 0 });
});
