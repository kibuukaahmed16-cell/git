import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/adminGuard";
import { getAnnouncement, setAnnouncement } from "@/lib/db";

// GET is intentionally public - it powers the site-wide banner, which
// everyone (signed in or not) should see. Only PATCH needs admin.
export async function GET() {
  const announcement = await getAnnouncement();
  return NextResponse.json({ announcement });
}

export async function PATCH(request) {
  const session = await auth();
  try {
    await requireAdmin(session);
    const { text } = await request.json();
    await setAnnouncement(text || null);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
