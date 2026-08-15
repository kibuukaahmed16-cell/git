import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/adminGuard";
import { listFeedback, setFeedbackStatus } from "@/lib/db";
import { sendEmail, feedbackResolvedEmail } from "@/lib/email";

export async function GET() {
  const session = await auth();
  try {
    await requireAdmin(session);
    const feedback = await listFeedback();
    return NextResponse.json({ feedback });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function PATCH(request) {
  const session = await auth();
  try {
    await requireAdmin(session);
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    const updated = await setFeedbackStatus(id, status);
    if (status === "resolved" && updated?.email) {
      sendEmail({ to: updated.email, ...feedbackResolvedEmail(updated.message) }).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
