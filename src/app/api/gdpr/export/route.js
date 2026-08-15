import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportUserData } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const data = await exportUserData(session.user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="t3rri-hub-data-export.json"',
    },
  });
}
