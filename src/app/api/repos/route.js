import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGithubToken } from "@/lib/sessionToken";
import { listMyRepos } from "@/lib/githubApi";
import { rateLimit } from "@/lib/rateLimit";

export async function GET() {
  const session = await auth();
  try {
    const { user, token } = await requireGithubToken(session);
    const limited = rateLimit(`repos:${user.id}`, { limit: 30, windowMs: 60_000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many requests - try again in ${limited.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }
    const repos = await listMyRepos(token);
    return NextResponse.json({ repos });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
