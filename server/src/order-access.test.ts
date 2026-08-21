import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOrderAccessToken,
  hashOrderAccessToken,
  hasOrderAccess,
} from './lib/order-access.js';

function record(token: string, expiresAt = new Date(Date.now() + 60_000).toISOString()) {
  return {
    order_access_token_hash: hashOrderAccessToken(token),
    order_access_token_expires_at: expiresAt,
  };
}

test('order access accepts the matching unexpired token', () => {
  const token = createOrderAccessToken();
  assert.equal(hasOrderAccess(record(token), token), true);
});

test('order access rejects a different token', () => {
  const token = createOrderAccessToken();
  assert.equal(hasOrderAccess(record(token), createOrderAccessToken()), false);
});

test('order access rejects an expired token', () => {
  const token = createOrderAccessToken();
  const expired = new Date(Date.now() - 1_000).toISOString();
  assert.equal(hasOrderAccess(record(token, expired), token), false);
});

test('order access rejects missing token or missing ownership fields', () => {
  const token = createOrderAccessToken();
  assert.equal(hasOrderAccess(record(token), undefined), false);
  assert.equal(hasOrderAccess({}, token), false);
});
