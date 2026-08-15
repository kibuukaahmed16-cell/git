import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ENCRYPTION_KEY = "a".repeat(64);
const { encryptSecret, decryptSecret } = await import("../src/lib/crypto.js");

test("encryptSecret/decryptSecret round-trips a value", () => {
  const original = "ghp_supersecrettoken1234567890";
  const encrypted = encryptSecret(original);
  assert.notEqual(encrypted, original);
  assert.equal(decryptSecret(encrypted), original);
});

test("two encryptions of the same value produce different ciphertext", () => {
  // A fresh random IV every call means no two encrypted payloads should
  // ever match, even for identical input - important so stored tokens
  // don't leak patterns.
  const a = encryptSecret("same-value");
  const b = encryptSecret("same-value");
  assert.notEqual(a, b);
});

test("throws on a missing/malformed key instead of silently using a weak one", async () => {
  delete process.env.ENCRYPTION_KEY;
  // Re-import isn't possible for an ESM module already cached, so call
  // through a dynamic re-exec via a subprocess-free check: encryptSecret
  // reads process.env at call time, not import time, so this still
  // exercises the guard.
  assert.throws(() => encryptSecret("x"));
  process.env.ENCRYPTION_KEY = "a".repeat(64);
});
