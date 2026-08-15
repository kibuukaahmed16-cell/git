import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSettings, updateUserSettings } from "@/lib/db";

const ALLOWED_KEYS = new Set([
  "theme", "fontSize", "tabSize", "minimap", "wordWrap", "lineNumbers", "showHiddenFiles",
  "defaultBranch", "commitMessageTemplate", "emailOnPushSuccess", "emailOnPushFailure",
  "emailOnSignIn", "emailMilestones", "emailWeeklyDigest", "emailMonthlyReport",
  "emailReEngagement", "emailStashReminders", "slackWebhookUrl", "discordWebhookUrl",
]);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const settings = await getUserSettings(session.user.id);
  return NextResponse.json({ settings });
}

export async function PATCH(request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await request.json();
  const patch = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_KEYS.has(key)) patch[key] = body[key];
  }
  if (patch.fontSize) patch.fontSize = Math.min(28, Math.max(10, Number(patch.fontSize) || 14));
  if (patch.tabSize) patch.tabSize = [2, 4, 8].includes(Number(patch.tabSize)) ? Number(patch.tabSize) : 2;

  const settings = await updateUserSettings(session.user.id, patch);
  if (!settings) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ settings });
}
