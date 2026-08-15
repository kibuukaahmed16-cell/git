import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createShareLink, getFeatureFlags } from "@/lib/db";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const flags = await getFeatureFlags();
  if (!flags.shareLinks) {
    return NextResponse.json({ error: "Share links are turned off right now" }, { status: 403 });
  }

  const { repoFullName, files } = await request.json();
  if (!files?.length) return NextResponse.json({ error: "files is required" }, { status: 400 });

  const link = await createShareLink({ userId: session.user.id, repoFullName, files });
  return NextResponse.json({ token: link.token, expiresAt: link.expiresAt });
}
