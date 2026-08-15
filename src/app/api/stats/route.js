import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGamificationStats, listPushesForUser } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const [stats, recentPushes] = await Promise.all([
    getGamificationStats(session.user.id),
    listPushesForUser(session.user.id, { limit: 10 }),
  ]);

  return NextResponse.json({ stats, recentPushes });
}
