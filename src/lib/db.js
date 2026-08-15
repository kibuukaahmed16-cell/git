// Query layer over the Gist-backed store in gistDb.js. Everything
// elsewhere in the app (auth, API routes) should import from here,
// never from gistDb.js directly - this is the file to swap out if
// T3RRI HUB ever moves to a real database again.

import { randomUUID } from "node:crypto";
import { readDb, mutateDb } from "@/lib/gistDb";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------
// Users
// ---------------------------------------------------------------

export async function getUserById(id) {
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email) {
  if (!email) return null;
  const db = await readDb();
  return db.users.find((u) => u.email === email) || null;
}

export async function getUserByAccount({ provider, providerAccountId }) {
  const db = await readDb();
  const account = db.accounts.find(
    (a) => a.provider === provider && a.providerAccountId === providerAccountId
  );
  if (!account) return null;
  return db.users.find((u) => u.id === account.userId) || null;
}

export async function createUser(data) {
  const user = {
    id: randomUUID(),
    name: data.name ?? null,
    email: data.email ?? null,
    emailVerified: data.emailVerified ?? null,
    image: data.image ?? null,
    createdAt: now(),
    githubUsername: null,
    githubAvatarUrl: null,
    githubTokenEnc: null,
    isAdmin: isAdminIdentity(data) ,
  };
  await mutateDb((db) => {
    db.users.push(user);
  });
  return user;
}

export async function updateUserById(id, patch) {
  let updated = null;
  await mutateDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) return;
    Object.assign(user, patch);
    updated = user;
  });
  return updated;
}

export async function deleteUserCascade(id) {
  await mutateDb((db) => {
    db.users = db.users.filter((u) => u.id !== id);
    db.accounts = db.accounts.filter((a) => a.userId !== id);
    db.sessions = db.sessions.filter((s) => s.userId !== id);
    db.projects = db.projects.filter((p) => p.userId !== id);
    db.pushSubscriptions = db.pushSubscriptions.filter((p) => p.userId !== id);
    db.pushes = db.pushes.filter((p) => p.userId !== id);
    db.stashes = db.stashes.filter((s) => s.userId !== id);
    db.shareLinks = db.shareLinks.filter((s) => s.userId !== id);
    db.securityEvents = db.securityEvents.filter((s) => s.userId !== id);
  });
}

// A small, env-configured admin allowlist - no separate roles table to
// keep straight. Set ADMIN_GITHUB_USERNAMES and/or ADMIN_EMAILS
// (comma-separated) in your environment. Exported so auth.js can check
// this at sign-in time (once, into the JWT) without a DB round trip
// on every request.
export function isAdminIdentity({ email, githubUsername }) {
  const usernames = (process.env.ADMIN_GITHUB_USERNAMES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(
    (githubUsername && usernames.includes(githubUsername.toLowerCase())) ||
      (email && emails.includes(email.toLowerCase()))
  );
}

export async function isAdminUser(user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  return isAdminIdentity(user);
}

// ---------------------------------------------------------------
// Accounts (OAuth links)
// ---------------------------------------------------------------

export async function linkAccount(account) {
  const record = { id: randomUUID(), ...account };
  await mutateDb((db) => {
    db.accounts.push(record);
  });
  return record;
}

export async function unlinkAccount({ provider, providerAccountId }) {
  await mutateDb((db) => {
    db.accounts = db.accounts.filter(
      (a) => !(a.provider === provider && a.providerAccountId === providerAccountId)
    );
  });
}

// ---------------------------------------------------------------
// Sessions + verification tokens
// (Auth.js is configured with { strategy: "jwt" }, so these aren't on
// the hot path today - implemented so switching strategies later, or
// adding a magic-link provider, doesn't require touching the adapter.)
// ---------------------------------------------------------------

export async function createSession(session) {
  const record = { id: randomUUID(), ...session };
  await mutateDb((db) => {
    db.sessions.push(record);
  });
  return record;
}

export async function getSessionAndUser(sessionToken) {
  const db = await readDb();
  const session = db.sessions.find((s) => s.sessionToken === sessionToken);
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;
  return { session, user };
}

export async function updateSession(patch) {
  let updated = null;
  await mutateDb((db) => {
    const session = db.sessions.find((s) => s.sessionToken === patch.sessionToken);
    if (!session) return;
    Object.assign(session, patch);
    updated = session;
  });
  return updated;
}

export async function deleteSession(sessionToken) {
  await mutateDb((db) => {
    db.sessions = db.sessions.filter((s) => s.sessionToken !== sessionToken);
  });
}

export async function createVerificationToken(data) {
  await mutateDb((db) => {
    db.verificationTokens.push(data);
  });
  return data;
}

export async function useVerificationToken({ identifier, token }) {
  let found = null;
  await mutateDb((db) => {
    const idx = db.verificationTokens.findIndex(
      (v) => v.identifier === identifier && v.token === token
    );
    if (idx === -1) return;
    found = db.verificationTokens[idx];
    db.verificationTokens.splice(idx, 1);
  });
  return found;
}

// ---------------------------------------------------------------
// Projects (repo + branch a user has pushed to)
// ---------------------------------------------------------------

export async function upsertProject({ userId, repoFullName, branch, lastPushedAt }) {
  let record = null;
  await mutateDb((db) => {
    let project = db.projects.find((p) => p.userId === userId && p.repoFullName === repoFullName);
    if (project) {
      project.branch = branch;
      project.lastPushedAt = lastPushedAt;
    } else {
      project = {
        id: randomUUID(),
        userId,
        repoFullName,
        branch,
        lastPushedAt,
        createdAt: now(),
      };
      db.projects.push(project);
    }
    record = project;
  });
  return record;
}

export async function listProjectsForUser(userId) {
  const db = await readDb();
  return db.projects
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.lastPushedAt || 0) - new Date(a.lastPushedAt || 0));
}

// ---------------------------------------------------------------
// Push subscriptions (web push)
// ---------------------------------------------------------------

export async function listPushSubscriptionsForUser(userId) {
  const db = await readDb();
  return db.pushSubscriptions.filter((s) => s.userId === userId);
}

export async function upsertPushSubscriptionByEndpoint({ endpoint, userId, p256dh, auth }) {
  await mutateDb((db) => {
    let sub = db.pushSubscriptions.find((s) => s.endpoint === endpoint);
    if (sub) {
      sub.userId = userId;
      if (p256dh) sub.p256dh = p256dh;
      if (auth) sub.auth = auth;
    } else {
      db.pushSubscriptions.push({
        id: randomUUID(),
        userId,
        endpoint,
        p256dh,
        auth,
        createdAt: now(),
      });
    }
  });
}

export async function deletePushSubscriptionById(id) {
  await mutateDb((db) => {
    db.pushSubscriptions = db.pushSubscriptions.filter((s) => s.id !== id);
  });
}

export async function deletePushSubscriptionsByEndpoint(endpoint) {
  await mutateDb((db) => {
    db.pushSubscriptions = db.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  });
}

// ---------------------------------------------------------------
// Push history (also powers gamification: streaks/badges/graph)
// ---------------------------------------------------------------

export async function recordPush({ userId, repoFullName, branch, fileCount, success, detail }) {
  const entry = {
    id: randomUUID(),
    userId,
    repoFullName,
    branch,
    fileCount: fileCount || 0,
    success: Boolean(success),
    detail: detail || null,
    createdAt: now(),
  };
  await mutateDb((db) => {
    db.pushes.push(entry);
    // Keep this list from growing without bound - a rolling window of
    // the most recent 2000 pushes (across all users) is plenty for
    // history/stats and keeps the JSON document small.
    if (db.pushes.length > 2000) db.pushes = db.pushes.slice(-2000);
  });
  return entry;
}

// Thresholds that trigger both the client-side confetti burst (via
// /api/stats) and the server-side milestone email (sent from the push
// route right after a successful push crosses one of these).
export const MILESTONE_THRESHOLDS = [1, 10, 25, 50, 100, 250, 500, 1000];

export async function countSuccessfulPushes(userId) {
  const db = await readDb();
  return db.pushes.filter((p) => p.userId === userId && p.success).length;
}

export async function listPushesForUser(userId, { limit = 50 } = {}) {
  const db = await readDb();
  return db.pushes
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

// ---------------------------------------------------------------
// Stashes (named snapshots of the in-browser workspace)
// ---------------------------------------------------------------

export async function createStash({ userId, repoFullName, label, files }) {
  const entry = {
    id: randomUUID(),
    userId,
    repoFullName: repoFullName || null,
    label: label || "Untitled stash",
    files,
    createdAt: now(),
  };
  await mutateDb((db) => {
    db.stashes.push(entry);
  });
  return entry;
}

export async function listStashesForUser(userId) {
  const db = await readDb();
  return db.stashes
    .filter((s) => s.userId === userId)
    .map(({ files, ...meta }) => ({ ...meta, fileCount: files.length }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getStash(id, userId) {
  const db = await readDb();
  return db.stashes.find((s) => s.id === id && s.userId === userId) || null;
}

export async function deleteStash(id, userId) {
  await mutateDb((db) => {
    db.stashes = db.stashes.filter((s) => !(s.id === id && s.userId === userId));
  });
}

// ---------------------------------------------------------------
// Share links (read-only view of a snapshot of files)
// ---------------------------------------------------------------

export async function createShareLink({ userId, repoFullName, files, expiresInDays = 14 }) {
  const entry = {
    token: randomUUID().replace(/-/g, ""),
    userId,
    repoFullName: repoFullName || null,
    files,
    createdAt: now(),
    expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
  };
  await mutateDb((db) => {
    db.shareLinks.push(entry);
  });
  return entry;
}

export async function getShareLink(token) {
  const db = await readDb();
  const link = db.shareLinks.find((s) => s.token === token);
  if (!link) return null;
  if (new Date(link.expiresAt) < new Date()) return null;
  return link;
}

// ---------------------------------------------------------------
// Per-user settings (editor prefs, notification prefs, templates)
// ---------------------------------------------------------------

const DEFAULT_SETTINGS = {
  theme: "dark",
  fontSize: 14,
  tabSize: 2,
  minimap: false,
  wordWrap: true,
  lineNumbers: true,
  showHiddenFiles: false,
  defaultBranch: "main",
  commitMessageTemplate: "Update via T3RRI HUB",
  emailOnPushSuccess: true,
  emailOnPushFailure: true,
  emailOnSignIn: true,
  emailMilestones: true,
  emailWeeklyDigest: false,
  emailMonthlyReport: false,
  emailReEngagement: true,
  emailStashReminders: true,
  slackWebhookUrl: "",
  discordWebhookUrl: "",
};

export async function getUserSettings(userId) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  return { ...DEFAULT_SETTINGS, ...(user?.settings || {}) };
}

export async function updateUserSettings(userId, patch) {
  let result = null;
  await mutateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return;
    user.settings = { ...DEFAULT_SETTINGS, ...(user.settings || {}), ...patch };
    result = user.settings;
  });
  return result;
}

// ---------------------------------------------------------------
// Feedback / support
// ---------------------------------------------------------------

export async function addFeedback({ userId, email, message }) {
  const entry = {
    id: randomUUID(),
    userId: userId || null,
    email: email || null,
    message,
    status: "open",
    createdAt: now(),
  };
  await mutateDb((db) => {
    db.feedback.push(entry);
  });
  return entry;
}

export async function listFeedback() {
  const db = await readDb();
  return [...db.feedback].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function setFeedbackStatus(id, status) {
  let updated = null;
  await mutateDb((db) => {
    const item = db.feedback.find((f) => f.id === id);
    if (item) {
      item.status = status;
      updated = item;
    }
  });
  return updated;
}

// ---------------------------------------------------------------
// Security events (lightweight audit trail - sign-ins, token issues)
// ---------------------------------------------------------------

export async function addSecurityEvent({ userId, type, ip, userAgent }) {
  const entry = { id: randomUUID(), userId, type, ip: ip || null, userAgent: userAgent || null, createdAt: now() };
  await mutateDb((db) => {
    db.securityEvents.push(entry);
    if (db.securityEvents.length > 1000) db.securityEvents = db.securityEvents.slice(-1000);
  });
  return entry;
}

export async function listSecurityEventsForUser(userId, { limit = 20 } = {}) {
  const db = await readDb();
  return db.securityEvents
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

// ---------------------------------------------------------------
// Route usage counters (lightweight "API usage monitoring")
// ---------------------------------------------------------------

export async function incrementRouteUsage(route) {
  await mutateDb((db) => {
    db.routeUsage[route] = (db.routeUsage[route] || 0) + 1;
  });
}

export async function getRouteUsage() {
  const db = await readDb();
  return db.routeUsage;
}

// ---------------------------------------------------------------
// Feature flags + announcement banner (admin-controlled)
// ---------------------------------------------------------------

export const FEATURE_FLAG_DEFAULTS = {
  aiTools: true,
  gamification: true,
  shareLinks: true,
  stashes: true,
  webhookNotifications: true,
};

export async function getFeatureFlags() {
  const db = await readDb();
  return { ...FEATURE_FLAG_DEFAULTS, ...(db.featureFlags || {}) };
}

export async function setFeatureFlag(key, value) {
  await mutateDb((db) => {
    db.featureFlags = { ...db.featureFlags, [key]: value };
  });
}

export async function getAnnouncement() {
  const db = await readDb();
  return db.announcement;
}

export async function setAnnouncement(text) {
  await mutateDb((db) => {
    db.announcement = text ? { text, updatedAt: now() } : null;
  });
}

// ---------------------------------------------------------------
// Leaderboard (most pushes, across users who opted into an account)
// ---------------------------------------------------------------

export async function getLeaderboard({ limit = 10 } = {}) {
  const db = await readDb();
  const counts = new Map();
  for (const p of db.pushes) {
    if (!p.success) continue;
    counts.set(p.userId, (counts.get(p.userId) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, count]) => {
      const user = db.users.find((u) => u.id === userId);
      return { githubUsername: user?.githubUsername || user?.name || "unknown", pushCount: count };
    });
}

// ---------------------------------------------------------------
// Admin overview
// ---------------------------------------------------------------

export async function getAdminOverview() {
  const db = await readDb();
  const pushSuccesses = db.pushes.filter((p) => p.success).length;
  return {
    userCount: db.users.length,
    projectCount: db.projects.length,
    pushCount: db.pushes.length,
    pushSuccessRate: db.pushes.length ? Math.round((pushSuccesses / db.pushes.length) * 100) : null,
    feedbackOpenCount: db.feedback.filter((f) => f.status === "open").length,
    routeUsage: db.routeUsage,
    recentUsers: [...db.users]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        githubUsername: u.githubUsername,
        createdAt: u.createdAt,
      })),
  };
}

/** Every user with an email on file - used for the admin broadcast tool. */
export async function listAllUsersWithEmail() {
  const db = await readDb();
  return db.users.filter((u) => u.email).map((u) => ({ id: u.id, email: u.email, name: u.name }));
}

// ---------------------------------------------------------------
// Gamification (streaks, badges, contribution graph)
// ---------------------------------------------------------------

const BADGES = [
  { id: "first_push", label: "First push", check: (s) => s.totalPushes >= 1 },
  { id: "ten_pushes", label: "10 pushes", check: (s) => s.totalPushes >= 10 },
  { id: "fifty_pushes", label: "50 pushes", check: (s) => s.totalPushes >= 50 },
  { id: "hundred_pushes", label: "100 pushes", check: (s) => s.totalPushes >= 100 },
  { id: "week_streak", label: "7-day streak", check: (s) => s.longestStreak >= 7 },
  { id: "month_streak", label: "30-day streak", check: (s) => s.longestStreak >= 30 },
  { id: "five_repos", label: "5 different repos", check: (s) => s.repoCount >= 5 },
];

function dayKey(iso) {
  return iso.slice(0, 10); // YYYY-MM-DD, in UTC
}

export async function getGamificationStats(userId) {
  const db = await readDb();
  const pushes = db.pushes.filter((p) => p.userId === userId && p.success);
  const days = [...new Set(pushes.map((p) => dayKey(p.createdAt)))].sort();
  const repoCount = new Set(pushes.map((p) => p.repoFullName)).size;

  let currentStreak = 0;
  let longestStreak = 0;
  let prevDay = null;
  for (const day of days) {
    if (prevDay) {
      const expectedNext = new Date(new Date(prevDay).getTime() + 86400000).toISOString().slice(0, 10);
      currentStreak = expectedNext === day ? currentStreak + 1 : 1;
    } else {
      currentStreak = 1;
    }
    prevDay = day;
    longestStreak = Math.max(longestStreak, currentStreak);
  }
  // Is the streak still "live" (pushed today or yesterday)?
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  const streakActive = days.length > 0 && (days.at(-1) === today || days.at(-1) === yesterday);

  const summary = {
    totalPushes: pushes.length,
    repoCount,
    activeDays: days.length,
    currentStreak: streakActive ? currentStreak : 0,
    longestStreak,
  };

  // Contribution graph: push counts per day for the last 90 days.
  const graph = [];
  for (let i = 89; i >= 0; i--) {
    const d = dayKey(new Date(Date.now() - i * 86400000).toISOString());
    graph.push({ date: d, count: pushes.filter((p) => dayKey(p.createdAt) === d).length });
  }

  const badges = BADGES.filter((b) => b.check(summary)).map((b) => ({ id: b.id, label: b.label }));

  return { ...summary, badges, graph };
}

// ---------------------------------------------------------------
// GDPR export / delete
// ---------------------------------------------------------------

export async function exportUserData(userId) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { githubTokenEnc, ...safeUser } = user;
  return {
    user: safeUser,
    accounts: db.accounts
      .filter((a) => a.userId === userId)
      .map(({ access_token, refresh_token, id_token, ...rest }) => rest),
    projects: db.projects.filter((p) => p.userId === userId),
    pushes: db.pushes.filter((p) => p.userId === userId),
    stashes: db.stashes.filter((s) => s.userId === userId),
    pushSubscriptions: db.pushSubscriptions.filter((p) => p.userId === userId),
    exportedAt: now(),
  };
}
