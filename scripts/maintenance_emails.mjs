#!/usr/bin/env node
// Three lightweight, opt-in maintenance emails in one pass (one Gist
// DB read instead of three, since they'd otherwise all run on roughly
// the same schedule anyway):
//
//   - re-engagement: hasn't pushed in 30-37 days
//   - token check: the stored GitHub token no longer works (reactive -
//     GitHub doesn't tell us an expiry date up front for most OAuth
//     Apps, so this can't warn "7 days before" the way a predictive
//     check could; it only catches tokens that have *already* stopped
//     working)
//   - stash reminder: stashes sitting untouched for 14+ days
//
// Not triggered by the app itself - see activity_report.mjs for why.
//
// Usage:
//   node scripts/maintenance_emails.mjs
//
// Needs the same environment as the app, plus GIST_DB_TOKEN/GIST_DB_ID
// for the read and EMAIL_FROM/EMAIL_APP_PASSWORD to send. The token
// check also needs ENCRYPTION_KEY to decrypt stored tokens.
//
// Suggested cron: 0 15 * * MON   (weekly is plenty for all three)

import { readDb } from "../src/lib/gistDb.js";
import { sendEmail, reEngagementEmail, tokenIssueEmail, stashReminderEmail } from "../src/lib/email.js";
import { decryptSecret } from "../src/lib/crypto.js";

// Keep in sync with DEFAULT_SETTINGS in src/lib/db.js - see
// activity_report.mjs for why this is duplicated instead of imported.
const SETTINGS_DEFAULTS = { emailReEngagement: true, emailStashReminders: true };
const effectiveSettings = (user) => ({ ...SETTINGS_DEFAULTS, ...(user.settings || {}) });

const db = await readDb({ fresh: true });
const now = Date.now();
const DAY = 86400000;

let reEngagementSent = 0;
let tokenIssueSent = 0;
let stashReminderSent = 0;

for (const user of db.users) {
  if (!user.email) continue;
  const settings = effectiveSettings(user);

  // --- Re-engagement: last successful push was 30-37 days ago.
  // A window (not just ">= 30 days") so a weekly cron run doesn't
  // re-send the same email for several weeks running.
  if (settings.emailReEngagement) {
    const userPushes = db.pushes.filter((p) => p.userId === user.id && p.success);
    const lastPush = userPushes.at(-1);
    const daysSince = lastPush ? (now - new Date(lastPush.createdAt).getTime()) / DAY : Infinity;
    if (daysSince >= 30 && daysSince < 37) {
      try {
        await sendEmail({ to: user.email, ...reEngagementEmail() });
        reEngagementSent++;
      } catch (err) {
        console.error(`Re-engagement email failed for ${user.email}:`, err.message);
      }
    }
  }

  // --- Token check: try a cheap authenticated GitHub API call.
  if (user.githubTokenEnc) {
    try {
      const token = decryptSecret(user.githubTokenEnc);
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (res.status === 401) {
        await sendEmail({ to: user.email, ...tokenIssueEmail() });
        tokenIssueSent++;
      }
    } catch (err) {
      console.error(`Token check failed for ${user.email}:`, err.message);
    }
  }

  // --- Stash reminder: stashes older than 14 days.
  if (settings.emailStashReminders) {
    const oldStashes = db.stashes.filter(
      (s) => s.userId === user.id && now - new Date(s.createdAt).getTime() >= 14 * DAY
    );
    if (oldStashes.length > 0) {
      try {
        await sendEmail({
          to: user.email,
          ...stashReminderEmail(oldStashes.map((s) => ({ label: s.label, fileCount: s.files.length }))),
        });
        stashReminderSent++;
      } catch (err) {
        console.error(`Stash reminder failed for ${user.email}:`, err.message);
      }
    }
  }
}

console.log(
  `Maintenance emails: ${reEngagementSent} re-engagement, ${tokenIssueSent} token-issue, ${stashReminderSent} stash-reminder (out of ${db.users.length} users).`
);
