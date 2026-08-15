import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/adminGuard";
import { getFeatureFlags, setFeatureFlag, FEATURE_FLAG_DEFAULTS } from "@/lib/db";

export async function GET() {
  const session = await auth();
  try {
    await requireAdmin(session);
    const flags = await getFeatureFlags();
    return NextResponse.json({ flags });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function PATCH(request) {
  const session = await auth();
  try {
    await requireAdmin(session);
    const { key, value } = await request.json();
    if (!Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFAULTS, key)) {
      return NextResponse.json({ error: `Unknown flag: ${key}` }, { status: 400 });
    }
    await setFeatureFlag(key, Boolean(value));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
