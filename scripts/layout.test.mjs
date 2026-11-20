// Unit tests of the dashboard's layout model (src/components/layout.ts): node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, add, cleanItems, collides, compact, fit, freeSpot, move, nameProblem, ordered, remove, resize, validate } from '../src/components/layout.ts';

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
