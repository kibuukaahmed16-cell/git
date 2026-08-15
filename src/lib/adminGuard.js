// Admin access is a small env-configured allowlist (ADMIN_GITHUB_USERNAMES
// / ADMIN_EMAILS - see src/lib/db.js's isAdminUser), not a role stored
// per-request. Every /api/admin/* route calls this first.

import { getUserById, isAdminUser } from "@/lib/db";

export async function requireAdmin(session) {
  if (!session?.user?.id) {
    const err = new Error("Sign in first");
    err.status = 401;
    throw err;
  }
  const user = await getUserById(session.user.id);
  if (!(await isAdminUser(user))) {
    const err = new Error("Admin access required");
    err.status = 403;
    throw err;
  }
  return user;
}
