import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (!transporter) {
    // Plain Gmail SMTP is fine for low volume (Gmail caps around 500
    // sends/day and can be flagged as spam more easily than a
    // dedicated sender). For real production volume, swap this for
    // Resend, Postmark, or SendGrid - sendEmail()'s signature below
    // won't need to change.
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_APP_PASSWORD) {
    console.warn("EMAIL_APP_PASSWORD not set - skipping email send:", subject);
    return { skipped: true };
  }
  return getTransporter().sendMail({
    from: `"T3RRI HUB" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
}

function wrap(bodyHtml) {
  return `<div style="font-family:sans-serif;color:#1a1a1a;max-width:480px;line-height:1.6">
    ${bodyHtml}
    <p style="margin-top:28px;color:#888;font-size:12px">&mdash; T3RRI HUB</p>
  </div>`;
}

export function welcomeEmail(name) {
  return {
    subject: "Welcome to T3RRI HUB",
    html: wrap(`<p>Hi ${name || "there"},</p>
      <p>Your T3RRI HUB account is ready. Upload a file or a zip, edit it in the
      browser, and push straight to GitHub whenever you're ready.</p>`),
  };
}

// Context-specific "here's what to try" line for a failed push, based
// on what gitOps.js classified the error as.
function fixTip(errorType) {
  switch (errorType) {
    case "auth":
      return "This usually means the stored GitHub token stopped working. Sign out and sign back in with GitHub to refresh it.";
    case "not_found":
      return "Double check the repo name is exactly right (owner/repo) and that this GitHub account has push access to it.";
    case "remote_ahead":
      return "The branch has commits this workspace doesn't have. Use \u201cFetch latest\u201d to pull them in, or push again with force if you're sure you want to overwrite them.";
    default:
      return "Open T3RRI HUB and check the push bar for the full error message.";
  }
}

export function pushResultEmail({ repoFullName, branch, success, detail, errorType, commitUrl, fileCount }) {
  if (success) {
    return {
      subject: `Pushed to ${repoFullName}`,
      html: wrap(`<p>Pushed ${fileCount ? `${fileCount} file(s) ` : ""}to <b>${repoFullName}</b> on <code>${branch}</code>.</p>
        ${commitUrl ? `<p><a href="${commitUrl}">View the commit on GitHub &rarr;</a></p>` : ""}`),
    };
  }
  return {
    subject: `Push to ${repoFullName} failed`,
    html: wrap(`<p>Pushing to <b>${repoFullName}</b> on <code>${branch}</code> failed.</p>
      ${detail ? `<p style="color:#a33"><code>${escapeHtml(detail).slice(0, 300)}</code></p>` : ""}
      <p>${fixTip(errorType)}</p>`),
  };
}

export function securityAlertEmail({ ip, userAgent, time }) {
  return {
    subject: "New sign-in to your T3RRI HUB account",
    html: wrap(`<p>Your account was just signed in to.</p>
      <table style="font-size:13px;color:#555">
        <tr><td style="padding-right:12px">When</td><td>${time}</td></tr>
        ${ip ? `<tr><td style="padding-right:12px">IP</td><td>${escapeHtml(ip)}</td></tr>` : ""}
        ${userAgent ? `<tr><td style="padding-right:12px">Device</td><td>${escapeHtml(userAgent).slice(0, 120)}</td></tr>` : ""}
      </table>
      <p>Wasn't you? Revoke T3RRI HUB's access from your
      <a href="https://github.com/settings/applications">GitHub</a> or
      <a href="https://myaccount.google.com/permissions">Google</a> account settings.
      You can turn these emails off in Settings.</p>`),
  };
}

export function milestoneEmail(count) {
  return {
    subject: `🎉 ${count} pushes on T3RRI HUB`,
    html: wrap(`<p>That's <b>${count}</b> successful pushes. Nice work.</p>
      <p>Check your streak and badges in the Tools tab.</p>`),
  };
}

export function feedbackResolvedEmail(message) {
  return {
    subject: "Your T3RRI HUB feedback was resolved",
    html: wrap(`<p>Thanks for the note:</p>
      <p style="padding:10px 14px;background:#f3f3f3;border-radius:6px;color:#444">${escapeHtml(message).slice(0, 400)}</p>
      <p>It's been marked resolved. Reply to this email if it's not actually fixed.</p>`),
  };
}

export function weeklyDigestEmail({ pushCount, repoCount, topRepo }) {
  return {
    subject: pushCount ? `Your week on T3RRI HUB: ${pushCount} push(es)` : "Your week on T3RRI HUB",
    html: wrap(
      pushCount
        ? `<p>This week you pushed <b>${pushCount}</b> time(s) across <b>${repoCount}</b> repo(s).</p>
           ${topRepo ? `<p>Most active: <b>${topRepo}</b>.</p>` : ""}`
        : `<p>No pushes this week. Your files are exactly where you left them.</p>`
    ),
  };
}

export function monthlyReportEmail({ pushCount, successRate, repoCount, longestStreak }) {
  return {
    subject: "Your T3RRI HUB month in review",
    html: wrap(`<table style="font-size:14px;color:#333;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0">Pushes</td><td><b>${pushCount}</b></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Success rate</td><td><b>${successRate === null ? "—" : `${successRate}%`}</b></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Repos touched</td><td><b>${repoCount}</b></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Longest streak</td><td><b>${longestStreak} day(s)</b></td></tr>
      </table>`),
  };
}

export function reEngagementEmail() {
  return {
    subject: "Still there?",
    html: wrap(`<p>It's been a month since you pushed anything on T3RRI HUB. Your workspace (and any
      stashes you saved) are still there whenever you want to pick it back up.</p>`),
  };
}

export function tokenIssueEmail() {
  return {
    subject: "Your GitHub connection needs attention",
    html: wrap(`<p>T3RRI HUB tried a routine check against your stored GitHub token and it didn't go through -
      it may have been revoked or expired.</p>
      <p>Sign out and sign back in with GitHub to refresh it before your next push.</p>`),
  };
}

export function stashReminderEmail(stashes) {
  const list = stashes.map((s) => `<li>${escapeHtml(s.label)} &mdash; ${s.fileCount} file(s)</li>`).join("");
  return {
    subject: `You have ${stashes.length} stash(es) waiting`,
    html: wrap(`<p>These have been sitting for a couple weeks:</p><ul>${list}</ul>
      <p>Restore or delete them from the Tools tab whenever you get a chance.</p>`),
  };
}

export function announcementEmail({ subject, message }) {
  return {
    subject: subject || "An update from T3RRI HUB",
    html: wrap(`<div>${message}</div>`),
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
