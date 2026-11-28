// Unit tests of relativeTime (src/components/time.ts): node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime } from '../src/components/time.ts';

const NOW = Date.UTC(2026, 10, 28, 12, 0, 0), MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const en = ago => relativeTime(NOW - ago, 'en', NOW);

test('the last week is said in words, older is the date alone', () => {
  assert.equal(en(5_000), 'now');
  assert.equal(en(5 * MIN), '5 minutes ago');
  assert.equal(en(HOUR), '1 hour ago');
  assert.equal(en(23 * HOUR), '23 hours ago');
  assert.equal(en(DAY), 'yesterday');
  assert.equal(en(3 * DAY), '3 days ago');
  assert.match(en(8 * DAY), /^Nov 2[01], 2026$/);   // the 20th, or the 21st east of UTC+12
});

test('the page language, a broken language tag, and times that are not times', () => {
  assert.equal(relativeTime(NOW - DAY, 'pt-BR', NOW), 'ontem');
  assert.equal(relativeTime(NOW - 2 * HOUR, 'pt-BR', NOW), 'há 2 horas');
  assert.equal(typeof relativeTime(NOW - DAY, 'pt_BR', NOW), 'string');      // not a valid tag: the default locale, no throw
  assert.equal(en(-5 * MIN), 'now');                                         // a clock running fast
  assert.equal(relativeTime(null, 'en', NOW), '');
  assert.equal(relativeTime(NaN, 'en', NOW), '');
});
