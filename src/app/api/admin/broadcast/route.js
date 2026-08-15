import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/adminGuard";
import { listAllUsersWithEmail } from "@/lib/db";
import { sendEmail, announcementEmail } from "@/lib/email";

// Manual, admin-triggered email to every user with an address on file -
// covers "feature announcements" and "beta invites" from the original
// list. Deliberately not automatic/scheduled: the admin decides what's
// worth emailing everyone about, and reviews the message before it goes.
export async function POST(request) {
  const session = await auth();
  try {
    await requireAdmin(session);
    const { subject, message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const recipients = await listAllUsersWithEmail();
    const results = await Promise.allSettled(
      recipients.map((u) => sendEmail({ to: u.email, ...announcementEmail({ subject, message }) }))
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ success: true, sent, total: recipients.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
