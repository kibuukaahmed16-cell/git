import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGithubToken } from "@/lib/sessionToken";
import { listCommits } from "@/lib/githubApi";

export async function GET(request) {
  const session = await auth();
  const url = new URL(request.url);
  const repo = url.searchParams.get("repo");
  const branch = url.searchParams.get("branch") || undefined;
  if (!repo) return NextResponse.json({ error: "repo query param is required" }, { status: 400 });
  try {
    const { token } = await requireGithubToken(session);
    const commits = await listCommits(token, repo, { branch });
    return NextResponse.json({ commits });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
