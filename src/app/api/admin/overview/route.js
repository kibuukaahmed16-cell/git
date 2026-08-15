import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/adminGuard";
import { getAdminOverview } from "@/lib/db";

export async function GET() {
  const session = await auth();
  try {
    await requireAdmin(session);
    const overview = await getAdminOverview();
    return NextResponse.json({ overview });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
