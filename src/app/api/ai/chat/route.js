import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { askDeckAI, askDeckAITool, askDeckAIProjectStructure } from "@/lib/aiProvider";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { incrementRouteUsage } from "@/lib/db";

export async function POST(request) {
  const session = await auth();
  const limited = rateLimit(`ai:${session?.user?.id || clientIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests - try again in ${limited.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }
  incrementRouteUsage("/api/ai/chat").catch(() => {});

  const { message, fileContext, mode, filePaths } = await request.json();

  try {
    if (mode === "structure") {
      const answer = await askDeckAIProjectStructure(filePaths);
      return NextResponse.json({ answer });
    }
    if (mode) {
      const answer = await askDeckAITool(mode, fileContext);
      return NextResponse.json({ answer });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const answer = await askDeckAI(message, { fileContext });
  return NextResponse.json({ answer });
}
