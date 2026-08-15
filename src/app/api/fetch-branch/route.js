import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGithubToken } from "@/lib/sessionToken";
import { fetchRepoFiles } from "@/lib/githubApi";
import { rateLimit } from "@/lib/rateLimit";

// Powers both "fetch latest" (ref = branch name) and "restore this
// commit" (ref = commit sha) - pulling a snapshot of a repo's files
// into the in-browser editor is the same operation either way.
export async function POST(request) {
  const session = await auth();
  const { repo, ref } = await request.json();
  if (!repo || !ref) return NextResponse.json({ error: "repo and ref are required" }, { status: 400 });
  try {
    const { user, token } = await requireGithubToken(session);
    const limited = rateLimit(`fetch-branch:${user.id}`, { limit: 20, windowMs: 60_000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many requests - try again in ${limited.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }
    const files = await fetchRepoFiles(token, repo, ref);
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
