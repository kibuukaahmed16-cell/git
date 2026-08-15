import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLeaderboard } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const leaderboard = await getLeaderboard();
  return NextResponse.json({ leaderboard });
}
