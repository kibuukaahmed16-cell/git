import { test } from "node:test";
import assert from "node:assert/strict";
import { isBinaryPath, isImagePath, formatBytes, byteSize, extOf } from "../src/lib/fileTypes.js";

test("extOf lowercases and strips the dot", () => {
  assert.equal(extOf("Photo.JPG"), "jpg");
  assert.equal(extOf("noext"), "noext");
});

test("isImagePath recognizes common raster/vector formats", () => {
  assert.equal(isImagePath("logo.png"), true);
  assert.equal(isImagePath("logo.svg"), true);
  assert.equal(isImagePath("index.js"), false);
});

test("isBinaryPath treats known text extensions and extension-less files as text", () => {
  assert.equal(isBinaryPath("src/index.js"), false);
  assert.equal(isBinaryPath("Dockerfile"), false);
  assert.equal(isBinaryPath("LICENSE"), false);
  assert.equal(isBinaryPath("photo.png"), true);
  assert.equal(isBinaryPath("archive.zip"), true); // unknown extension -> binary by default
});

test("formatBytes scales units sensibly", () => {
  assert.equal(formatBytes(500), "500 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
});

test("byteSize accounts for base64 overhead vs plain utf8", () => {
  const text = { content: "hello", encoding: "utf8" };
  assert.equal(byteSize(text), 5);

  // "aGVsbG8=" is base64 for "hello" (5 bytes)
  const b64 = { content: "aGVsbG8=", encoding: "base64" };
  assert.equal(byteSize(b64), 6); // approx - see byteSize's 3/4 estimate
});
