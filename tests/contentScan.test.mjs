import { test } from "node:test";
import assert from "node:assert/strict";
import { scanForRiskyPatterns } from "../src/lib/contentScan.js";

test("flags a private key block", () => {
  const hit = scanForRiskyPatterns("-----BEGIN RSA PRIVATE KEY-----\nMIIExyz\n-----END RSA PRIVATE KEY-----");
  assert.match(hit, /private key/);
});

test("flags what looks like a hardcoded AWS access key", () => {
  const hit = scanForRiskyPatterns("const key = 'AKIAABCDEFGHIJKLMNOP';");
  assert.match(hit, /AWS access key/);
});

test("does not flag ordinary source code", () => {
  const hit = scanForRiskyPatterns("export function add(a, b) { return a + b; }");
  assert.equal(hit, null);
});

test("skips huge files rather than scanning them", () => {
  const huge = "a".repeat(2_000_001);
  assert.equal(scanForRiskyPatterns(huge), null);
});
