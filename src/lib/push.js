import webpush from "web-push";
import { listPushSubscriptionsForUser, deletePushSubscriptionById } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:gitlob1542@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
}

/** Sends a push notification to every device a user has subscribed on. */
export async function sendPushToUser(userId, payload) {
  ensureConfigured();
  const subs = await listPushSubscriptionsForUser(userId);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 410/404 means the subscription is dead (uninstalled, expired) - clean it up.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await deletePushSubscriptionById(sub.id).catch(() => {});
        } else {
          console.error("Push send failed:", err.message);
        }
      }
    })
  );
}
