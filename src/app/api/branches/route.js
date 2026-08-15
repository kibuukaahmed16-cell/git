import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGithubToken } from "@/lib/sessionToken";
import { listBranches, createBranch } from "@/lib/githubApi";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(request) {
  const session = await auth();
  const repo = new URL(request.url).searchParams.get("repo");
  if (!repo) return NextResponse.json({ error: "repo query param is required" }, { status: 400 });
  try {
    const { token } = await requireGithubToken(session);
    const branches = await listBranches(token, repo);
    return NextResponse.json({ branches });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  const { repo, newBranch, fromBranch } = await request.json();
  if (!repo || !newBranch || !fromBranch) {
    return NextResponse.json({ error: "repo, newBranch, and fromBranch are required" }, { status: 400 });
  }
  try {
    const { user, token } = await requireGithubToken(session);
    const limited = rateLimit(`create-branch:${user.id}`, { limit: 15, windowMs: 60_000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many requests - try again in ${limited.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }
    const branch = await createBranch(token, repo, { newBranch, fromBranch });
    return NextResponse.json({ branch });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
