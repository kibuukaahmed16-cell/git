import { NextResponse } from "next/server";
import { safeExtractZip } from "@/lib/zipExtract";
import { isBinaryPath } from "@/lib/fileTypes";
import { scanForRiskyPatterns } from "@/lib/contentScan";
import { auth } from "@/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { incrementRouteUsage } from "@/lib/db";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(request) {
  const session = await auth();
  const limited = rateLimit(`upload:${session?.user?.id || clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many uploads - try again in ${limited.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }
  incrementRouteUsage("/api/upload").catch(() => {});

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const uploads = formData.getAll("files");
  if (!uploads.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results = [];

  for (const file of uploads) {
    if (typeof file === "string") continue;

    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.name.toLowerCase().endsWith(".zip")) {
      try {
        results.push(...safeExtractZip(buffer));
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      continue;
    }

    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} is over the 25MB limit` }, { status: 400 });
    }

    // For folder uploads the client sets the appended filename to
    // file.webkitRelativePath, so this already carries the folder
    // structure (e.g. "my-site/src/index.js"). Images are kept as
    // base64 so they aren't corrupted by a forced utf8 decode.
    const binary = isBinaryPath(file.name);
    results.push({
      path: file.name,
      content: binary ? buffer.toString("base64") : buffer.toString("utf8"),
      encoding: binary ? "base64" : "utf8",
    });
  }

  // Heuristic, advisory-only heads-up - see contentScan.js. Never
  // blocks the upload, just flags things worth a second look.
  const warnings = [];
  for (const f of results) {
    if (f.encoding !== "utf8") continue;
    const hit = scanForRiskyPatterns(f.content);
    if (hit) warnings.push(`${f.path}: ${hit}`);
  }

  return NextResponse.json({ files: results, warnings });
}
