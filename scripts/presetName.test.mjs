// Unit tests of the preset display name (src/components/presetName.ts): node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presetDisplayName } from '../src/components/presetName.ts';

test('a preset name loses its internal prefix and its printer', () => {
  assert.equal(presetDisplayName('_local/spooler/PLA Matte - Black @X1'), 'PLA Matte - Black');
  assert.equal(presetDisplayName('Spooler/PLA Matte - Black @Snapmaker U1'), 'PLA Matte - Black');
  assert.equal(presetDisplayName('Generic PLA @BBL X1C'), 'Generic PLA');
  assert.equal(presetDisplayName('Bambu Lab PETG HF - Cobalt Blue @Bambu Lab X1 Carbon 0.4 nozzle'), 'Bambu Lab PETG HF - Cobalt Blue');
  assert.equal(presetDisplayName('  Generic PLA  '), 'Generic PLA');
});

test('keepPrinter keeps the printer and still drops the prefix', () => {
  assert.equal(presetDisplayName('_local/spooler/PLA Matte - Black @X1', true), 'PLA Matte - Black @X1');
  assert.equal(presetDisplayName('Generic PLA @BBL X1C', true), 'Generic PLA @BBL X1C');
});

test('names that are not internal stay whole', () => {
  assert.equal(presetDisplayName('PLA/PHA Blend'), 'PLA/PHA Blend');         // a slash of the name's own
  assert.equal(presetDisplayName('user@home PLA'), 'user@home PLA');         // an @ that is not " @printer"
  assert.equal(presetDisplayName('@X1'), '@X1');                             // nothing would be left
  assert.equal(presetDisplayName('_local/spooler/'), '_local/spooler/');
  assert.equal(presetDisplayName(null), '');
  assert.equal(presetDisplayName(undefined), '');
});
