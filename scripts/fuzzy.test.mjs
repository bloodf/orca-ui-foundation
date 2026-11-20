// Unit tests of the file search's fuzzy scorer (src/components/fuzzy.ts): node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyMatch, fuzzyFilter } from '../src/components/fuzzy.ts';

const order = (names, q) => fuzzyFilter(names, q, x => x).map(r => r.item);

test('case and accents do not matter', () => {
  assert.ok(fuzzyMatch('CUBE', 'cube.gcode'));
  assert.ok(fuzzyMatch('peca', 'Peça_benchy.gcode'));
  assert.ok(fuzzyMatch('PEÇA', 'peca.gcode'));
});

test('letters in order with gaps match; out of order or missing do not', () => {
  assert.deepEqual(fuzzyMatch('bnch', 'benchy_PLA.gcode').hits, [0, 2, 3, 4]);
  assert.equal(fuzzyMatch('hcneb', 'benchy.gcode'), null);
  assert.equal(fuzzyMatch('xyz', 'benchy.gcode'), null);
});

test('separators are word breaks, skipped on both sides', () => {
  assert.ok(fuzzyMatch('benchy pla', 'benchy_PLA.gcode'));
  assert.ok(fuzzyMatch('benchy-pla', 'benchy PLA.gcode'));
  assert.ok(fuzzyMatch('bp', 'benchy_PLA.gcode'), 'word starts');
  // the P of PLA is taken at its word start, not the p of "plate" inside a word
  assert.deepEqual(fuzzyMatch('bp', 'benchyplate_PLA.gcode').hits, [0, 12]);
});

test('ranked best first: exact, prefix, word start, contiguous, then with gaps', () => {
  const names = ['xbenchx.gcode', 'my_bench_2.gcode', 'benchy_PLA.gcode', 'b-e-n-c-h.gcode', 'bench.gcode', 'bxexnxcxh.gcode'];
  assert.deepEqual(order(names, 'bench'), ['bench.gcode', 'b-e-n-c-h.gcode', 'benchy_PLA.gcode', 'my_bench_2.gcode', 'xbenchx.gcode', 'bxexnxcxh.gcode']);
  assert.deepEqual(order(['abc_d.gcode', 'xabcd.gcode'], 'abcd'), ['abc_d.gcode', 'xabcd.gcode'], 'a whole word run beats a run inside a word');
});

test('ties keep the given order; an empty query keeps everything', () => {
  assert.deepEqual(order(['b1.gcode', 'a1.gcode'], '1'), ['b1.gcode', 'a1.gcode']);
  assert.deepEqual(order(['b', 'a'], '  '), ['b', 'a']);
  assert.deepEqual(fuzzyMatch('', 'x').hits, []);
});

test('hits point at the original characters (accents, separators)', () => {
  const name = 'Peça_benchy.gcode';
  assert.equal(fuzzyMatch('pecab', name).hits.map(i => name[i]).join(''), 'Peçab');
});
