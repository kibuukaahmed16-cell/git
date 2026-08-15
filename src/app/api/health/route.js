import { NextResponse } from "next/server";
import { readDb } from "@/lib/gistDb";

// Cheap liveness/readiness check for Railway/VPS process monitors and
// the "system status" admin view - confirms the app can actually
// reach its Gist DB, not just that the Node process is alive.
export async function GET() {
  const startedAt = Date.now();
  try {
    await readDb({ fresh: true });
    return NextResponse.json({
      status: "ok",
      dbReachable: true,
      latencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", dbReachable: false, error: err.message },
      { status: 503 }
    );
  }
}
