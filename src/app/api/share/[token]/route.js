import { NextResponse } from "next/server";
import { getShareLink } from "@/lib/db";

// Deliberately unauthenticated - the whole point of a share link is
// that whoever has the URL can view it, read-only, until it expires.
export async function GET(_request, { params }) {
  const { token } = await params;
  const link = await getShareLink(token);
  if (!link) return NextResponse.json({ error: "This link is invalid or has expired" }, { status: 404 });
  return NextResponse.json({
    repoFullName: link.repoFullName,
    files: link.files,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  });
}
