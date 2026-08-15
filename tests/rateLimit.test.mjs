import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../src/lib/rateLimit.js";

test("allows requests under the limit and blocks over it", () => {
  const key = `test-key-${Math.random()}`;
  for (let i = 0; i < 3; i++) {
    assert.equal(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok, true);
  }
  assert.equal(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok, false);
});

test("different keys have independent buckets", () => {
  const a = `key-a-${Math.random()}`;
  const b = `key-b-${Math.random()}`;
  rateLimit(a, { limit: 1, windowMs: 60_000 });
  assert.equal(rateLimit(a, { limit: 1, windowMs: 60_000 }).ok, false);
  assert.equal(rateLimit(b, { limit: 1, windowMs: 60_000 }).ok, true);
});
