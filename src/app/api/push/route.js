import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserById,
  upsertProject,
  recordPush,
  getUserSettings,
  incrementRouteUsage,
  countSuccessfulPushes,
  MILESTONE_THRESHOLDS,
} from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { pushFilesToGithub } from "@/lib/gitOps";
import { sendEmail, pushResultEmail, milestoneEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { notifyWebhooks } from "@/lib/webhooks";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in with GitHub first" }, { status: 401 });
  }

  const limited = rateLimit(`push:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many pushes - try again in ${limited.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }
  incrementRouteUsage("/api/push").catch(() => {});

  const body = await request.json();
  const { files, repoFullName, branch = "main", commitMessage, force } = body;

  if (!repoFullName || !files?.length) {
    return NextResponse.json({ error: "repoFullName and files are required" }, { status: 400 });
  }

  const user = await getUserById(session.user.id);
  if (!user?.githubTokenEnc) {
    return NextResponse.json(
      { error: "No GitHub token on file. Sign out and sign back in with GitHub." },
      { status: 400 }
    );
  }

  let githubToken;
  try {
    githubToken = decryptSecret(user.githubTokenEnc);
  } catch {
    return NextResponse.json({ error: "Could not decrypt stored GitHub token" }, { status: 500 });
  }

  const settings = await getUserSettings(user.id);

  try {
    const result = await pushFilesToGithub({
      files,
      repoFullName,
      branch,
      commitMessage: commitMessage?.trim() || settings.commitMessageTemplate,
      githubToken,
      gitUserName: user.githubUsername || user.name || "T3RRI HUB",
      gitUserEmail: user.email || "noreply@t3rri-hub.app",
      force: Boolean(force),
    });

    await upsertProject({
      userId: user.id,
      repoFullName,
      branch,
      lastPushedAt: new Date().toISOString(),
    });
    recordPush({ userId: user.id, repoFullName, branch, fileCount: files.length, success: true }).catch(
      () => {}
    );

    // Best-effort notifications - a slow or failed email/push/webhook
    // should never turn a successful push into an error response.
    if (user.email && settings.emailOnPushSuccess) {
      sendEmail({
        to: user.email,
        ...pushResultEmail({
          repoFullName,
          branch,
          success: true,
          commitUrl: result.commitUrl,
          fileCount: files.length,
        }),
      }).catch(() => {});
    }
    sendPushToUser(user.id, { title: "Push complete", body: `${repoFullName} (${branch})` }).catch(
      () => {}
    );
    notifyWebhooks(settings, { repoFullName, branch, success: true, fileCount: files.length }).catch(
      () => {}
    );

    // Milestone email - independent of the push-success email above,
    // since it's a different occasion (a round-number nudge, not a
    // per-push receipt). Never worth failing the request over.
    if (user.email && settings.emailMilestones) {
      countSuccessfulPushes(user.id)
        .then((count) => {
          if (MILESTONE_THRESHOLDS.includes(count)) {
            return sendEmail({ to: user.email, ...milestoneEmail(count) });
          }
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const detail = err.detail || err.message;
    recordPush({
      userId: user.id,
      repoFullName,
      branch,
      fileCount: files.length,
      success: false,
      detail,
    }).catch(() => {});

    if (err.errorType === "remote_ahead") {
      return NextResponse.json(
        {
          error: "REMOTE_AHEAD",
          message:
            "The remote branch has commits this workspace doesn't. Push again with force to overwrite it.",
        },
        { status: 409 }
      );
    }

    if (user.email && settings.emailOnPushFailure) {
      sendEmail({
        to: user.email,
        ...pushResultEmail({ repoFullName, branch, success: false, detail, errorType: err.errorType }),
      }).catch(() => {});
    }
    notifyWebhooks(settings, { repoFullName, branch, success: false, detail }).catch(() => {});

    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
