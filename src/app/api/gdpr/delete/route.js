import { NextResponse } from "next/server";
import { auth, signOut } from "@/auth";
import { deleteUserCascade } from "@/lib/db";

// The client is expected to sign the user out immediately after this
// succeeds (there's no session left to be signed out of server-side
// once the underlying user record is gone).
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { confirm } = await request.json().catch(() => ({}));
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: 'Send { "confirm": "DELETE" } to proceed' }, { status: 400 });
  }

  await deleteUserCascade(session.user.id);
  return NextResponse.json({ success: true });
}
