import test from 'node:test';
import assert from 'node:assert/strict';
import { id, orderNumber, slugify } from './lib/ids.js';

test('id creates a prefixed URL-safe identifier', () => {
  const value = id('test');
  assert.match(value, /^test_[A-Za-z0-9_-]{16}$/);
});

test('orderNumber uses the public LUM format and safe alphabet', () => {
  assert.match(orderNumber(), /^LUM-[A-HJ-NP-Z2-9]{6}$/);
});

test('slugify normalizes accents and punctuation', () => {
  assert.equal(slugify('Crème & Calm — 50 ml'), 'creme-calm-50-ml');
});
