import AdmZip from "adm-zip";
import path from "node:path";
import { isBinaryPath } from "@/lib/fileTypes";

const MAX_ENTRIES = 2000;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200MB uncompressed, guards against zip bombs
const MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Extracts a zip buffer into an array of {path, content, encoding}
 * entries without ever touching disk. Skips directories and refuses
 * entries whose path would escape the destination (the classic
 * "zip slip" trick using ../). Image files are kept as base64 so they
 * survive the round trip intact; everything else is treated as utf8
 * text.
 */
export function safeExtractZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Zip has too many files (${entries.length}), limit is ${MAX_ENTRIES}`);
  }

  const results = [];
  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const normalized = path.normalize(entry.entryName).replace(/^(\.\.[/\\])+/, "");
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      throw new Error(`Unsafe path in zip: ${entry.entryName}`);
    }

    const size = entry.header.size;
    if (size > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`${entry.entryName} is too large (over 25MB)`);
    }
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error("Zip is too large once extracted (over 200MB)");
    }

    const normalizedPath = normalized.split(path.sep).join("/");
    const binary = isBinaryPath(normalizedPath);
    const data = entry.getData();

    results.push({
      path: normalizedPath,
      content: binary ? data.toString("base64") : data.toString("utf8"),
      encoding: binary ? "base64" : "utf8",
    });
  }

  return results;
}
