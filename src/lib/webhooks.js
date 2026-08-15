// Fires a best-effort Slack and/or Discord notification for a push
// result, if the user has configured a webhook URL in Settings. Both
// platforms accept a simple JSON body on their incoming-webhook URL,
// no SDK needed - so this is just two fetch() calls.

export async function notifyWebhooks(settings, { repoFullName, branch, success, detail, fileCount }) {
  if (!settings) return;

  const summary = success
    ? `Pushed ${fileCount ? `${fileCount} file(s) ` : ""}to ${repoFullName} on ${branch}`
    : `Push to ${repoFullName} on ${branch} failed${detail ? `: ${detail}` : ""}`;

  const jobs = [];
  if (settings.slackWebhookUrl) {
    jobs.push(postJson(settings.slackWebhookUrl, { text: `${success ? "✅" : "❌"} ${summary}` }));
  }
  if (settings.discordWebhookUrl) {
    jobs.push(postJson(settings.discordWebhookUrl, { content: `${success ? "✅" : "❌"} ${summary}` }));
  }
  await Promise.allSettled(jobs);
}

async function postJson(url, body) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Webhook notify failed:", err.message);
  }
}
