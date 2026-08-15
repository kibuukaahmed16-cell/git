import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addFeedback } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(request) {
  const session = await auth();
  const { message, email } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const limited = rateLimit(`feedback:${session?.user?.id || clientIp(request)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many submissions - try again in ${limited.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  await addFeedback({ userId: session?.user?.id || null, email: email || session?.user?.email, message: message.trim() });
  return NextResponse.json({ success: true });
}
