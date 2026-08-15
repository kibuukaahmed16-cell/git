#!/usr/bin/env node
// Sends the weekly digest or monthly report email to every user who's
// opted in. Not triggered by the app itself - a stock Next.js server
// has no background worker, so this runs on a schedule you set up
// (Railway Cron, or a VPS crontab entry).
//
// Usage:
//   node scripts/activity_report.mjs --period=weekly
//   node scripts/activity_report.mjs --period=monthly
//
// Needs the same environment as the app: GIST_DB_TOKEN, GIST_DB_ID,
// EMAIL_FROM, EMAIL_APP_PASSWORD.
//
// Suggested cron:
//   weekly:  0 14 * * MON    (Monday, 9am US/Eastern-ish - adjust to taste)
//   monthly: 0 14 1 * *      (1st of the month)
//
// This imports src/lib/gistDb.js and src/lib/email.js directly via a
// relative path rather than going through src/lib/db.js, because
// db.js (and most of the rest of src/lib) uses the "@/" path alias
// that only Next.js's own bundler resolves - plain `node` doesn't
// know what to do with it. gistDb.js and email.js are the two files
// in src/lib with zero "@/" imports, so they're safe to reuse as-is.

import { readDb } from "../src/lib/gistDb.js";
import { sendEmail, weeklyDigestEmail, monthlyReportEmail } from "../src/lib/email.js";

// Keep in sync with DEFAULT_SETTINGS in src/lib/db.js - duplicated
// here for the reason above.
const SETTINGS_DEFAULTS = { emailWeeklyDigest: false, emailMonthlyReport: false };
const effectiveSettings = (user) => ({ ...SETTINGS_DEFAULTS, ...(user.settings || {}) });

const period = (process.argv.find((a) => a.startsWith("--period=")) || "--period=weekly").split("=")[1];
if (!["weekly", "monthly"].includes(period)) {
  console.error('--period must be "weekly" or "monthly"');
  process.exit(1);
}

const windowDays = period === "monthly" ? 30 : 7;
const settingsKey = period === "monthly" ? "emailMonthlyReport" : "emailWeeklyDigest";

const db = await readDb({ fresh: true });
const since = Date.now() - windowDays * 86400000;

function longestStreak(successfulPushes) {
  const days = [...new Set(successfulPushes.map((p) => p.createdAt.slice(0, 10)))].sort();
  let streak = 0;
  let longest = 0;
  let prev = null;
  for (const day of days) {
    const expected = prev ? new Date(new Date(prev).getTime() + 86400000).toISOString().slice(0, 10) : null;
    streak = expected === day ? streak + 1 : 1;
    prev = day;
    longest = Math.max(longest, streak);
  }
  return longest;
}

let sent = 0;
for (const user of db.users) {
  if (!user.email) continue;
  if (!effectiveSettings(user)[settingsKey]) continue;

  const windowPushes = db.pushes.filter((p) => p.userId === user.id && new Date(p.createdAt).getTime() >= since);
  const successful = windowPushes.filter((p) => p.success);
  const repos = new Set(successful.map((p) => p.repoFullName));

  try {
    if (period === "weekly") {
      if (successful.length === 0) continue; // don't email an empty digest
      const counts = {};
      for (const p of successful) counts[p.repoFullName] = (counts[p.repoFullName] || 0) + 1;
      const topRepo = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      await sendEmail({
        to: user.email,
        ...weeklyDigestEmail({ pushCount: successful.length, repoCount: repos.size, topRepo }),
      });
    } else {
      const successRate = windowPushes.length ? Math.round((successful.length / windowPushes.length) * 100) : null;
      await sendEmail({
        to: user.email,
        ...monthlyReportEmail({
          pushCount: successful.length,
          successRate,
          repoCount: repos.size,
          longestStreak: longestStreak(successful),
        }),
      });
    }
    sent++;
  } catch (err) {
    console.error(`Failed to email ${user.email}:`, err.message);
  }
}

console.log(`${period} report: emailed ${sent} user(s) out of ${db.users.length} total.`);
