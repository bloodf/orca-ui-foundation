// Unit tests of the colour-first spool picker's grouping (src/components/spoolPick.ts): node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byRemaining, colourKey, groupByColour, materialsOf, normHex, spoolColours } from '../src/components/spoolPick.ts';

test('hex is normalised: case, leading #, alpha suffix; junk is no colour', () => {
  assert.equal(normHex('#C12E1F'), '#c12e1f');
  assert.equal(normHex('c12e1fff'), '#c12e1f');
  assert.equal(normHex('  #ABCDEF '), '#abcdef');
  assert.equal(normHex('red'), '');
  assert.equal(normHex(null), '');
});

test('multi-colour spools group by their colour set, in any order', () => {
  const a = { id: 1, colours: ['#FF0000', '#00ff00'] }, b = { id: 2, colours: ['#00FF00', 'ff0000'] };
  assert.equal(colourKey(a), colourKey(b));
  const groups = groupByColour([a, b]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].colours, ['#ff0000', '#00ff00'], 'shown in the first spool\'s order');
});

test('one listed colour (or a repeated one) is a single colour, not multi', () => {
  assert.deepEqual(spoolColours({ id: 1, colours: ['#111111'] }), ['#111111']);
  assert.deepEqual(spoolColours({ id: 1, colours: ['#111111', '#111111'], colour: '#222222' }), ['#222222']);
  assert.equal(groupByColour([{ id: 1, colours: ['#111111'] }, { id: 2, colour: '#111111' }]).length, 1);
});

test('same hex in different case is one group; no colour is its own group, last', () => {
  const groups = groupByColour([{ id: 1, colour: '#C12E1F' }, { id: 2, colour: 'c12e1f' }, { id: 3 }, { id: 4, colour: 'nope' }]);
  assert.deepEqual(groups.map(g => [g.key, g.spools.map(s => s.id)]), [['#c12e1f', [1, 2]], ['', [3, 4]]]);
  assert.equal(groups[1].colour, null);
});

test('spools in a group run fullest first, unknown last, ties by id', () => {
  const spools = [{ id: 10, remaining: null }, { id: 2, remaining: 50 }, { id: 3, remaining: 900 }, { id: 1, remaining: 50 }, { id: 9 }]
    .map(s => ({ ...s, colour: '#111111' }));
  assert.deepEqual(groupByColour(spools)[0].spools.map(s => s.id), [3, 1, 2, 9, 10]);
  assert.ok(byRemaining({ id: 1, remaining: 0 }, { id: 2, remaining: null }) < 0, 'an empty spool is known, before unknown');
});

test('groups in palette order: greys light to dark, then by hue, then multi-colour, then none', () => {
  const keys = groupByColour([
    { id: 1 }, { id: 2, colours: ['#ff0000', '#0000ff'] }, { id: 3, colour: '#0000ff' }, { id: 4, colour: '#111111' },
    { id: 5, colour: '#ff0000' }, { id: 6, colour: '#f4f4f4' }, { id: 7, colour: '#00ff00' },
  ]).map(g => g.key);
  assert.deepEqual(keys, ['#f4f4f4', '#111111', '#ff0000', '#00ff00', '#0000ff', '#0000ff+#ff0000', '']);
});

test('the input array is left as it was', () => {
  const spools = [{ id: 2, colour: '#111111', remaining: 1 }, { id: 1, colour: '#111111', remaining: 5 }];
  groupByColour(spools);
  assert.deepEqual(spools.map(s => s.id), [2, 1]);
});

test('materials: trimmed, no blanks, first-seen order', () => {
  assert.deepEqual(materialsOf([{ id: 1, material: 'PLA ' }, { id: 2, material: '' }, { id: 3, material: 'PETG' }, { id: 4, material: 'PLA' }, { id: 5 }]), ['PLA', 'PETG']);
});

test('2000 spools in 13 colours make 13 groups', () => {
  const spools = Array.from({ length: 2000 }, (_, i) => ({ id: i, colour: '#' + (i % 13).toString(16).padStart(2, '0').repeat(3), remaining: i % 997 }));
  const groups = groupByColour(spools);
  assert.equal(groups.length, 13);
  assert.equal(groups.reduce((n, g) => n + g.spools.length, 0), 2000);
});
