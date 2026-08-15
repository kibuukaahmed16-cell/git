import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertPushSubscriptionByEndpoint, deletePushSubscriptionsByEndpoint } from "@/lib/db";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const { subscription } = await request.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  await upsertPushSubscriptionByEndpoint({
    endpoint: subscription.endpoint,
    userId: session.user.id,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  await deletePushSubscriptionsByEndpoint(endpoint);
  return NextResponse.json({ success: true });
}
