// Shared by every route that calls the GitHub API on the user's
// behalf (repo browsing, branches, commits, fetch/restore). Throws an
// Error with a `.status` so callers can do a one-line try/catch.

import { getUserById } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export async function requireGithubToken(session) {
  if (!session?.user?.id) {
    const err = new Error("Sign in with GitHub first");
    err.status = 401;
    throw err;
  }
  const user = await getUserById(session.user.id);
  if (!user?.githubTokenEnc) {
    const err = new Error("No GitHub token on file. Sign out and sign back in with GitHub.");
    err.status = 400;
    throw err;
  }
  try {
    return { user, token: decryptSecret(user.githubTokenEnc) };
  } catch {
    const err = new Error("Could not decrypt stored GitHub token");
    err.status = 500;
    throw err;
  }
}
