import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStash, listStashesForUser, getStash, deleteStash } from "@/lib/db";

// GET /api/stash            -> list this user's stashes (metadata only)
// GET /api/stash?id=xxx     -> one stash's full file contents, to restore into the editor
export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const stash = await getStash(id, session.user.id);
    if (!stash) return NextResponse.json({ error: "Stash not found" }, { status: 404 });
    return NextResponse.json({ files: stash.files });
  }

  const stashes = await listStashesForUser(session.user.id);
  return NextResponse.json({ stashes });
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { repoFullName, label, files } = await request.json();
  if (!files?.length) return NextResponse.json({ error: "files is required" }, { status: 400 });
  const stash = await createStash({ userId: session.user.id, repoFullName, label, files });
  return NextResponse.json({ stash: { ...stash, files: undefined, fileCount: files.length } });
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteStash(id, session.user.id);
  return NextResponse.json({ success: true });
}
