"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function InstallAndNotify() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [notifStatus, setNotifStatus] = useState("default");

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handler);
    if (typeof Notification !== "undefined") setNotifStatus(Notification.permission);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm !== "granted") return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/notify/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub }),
    });
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {installPrompt && (
        <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={install}>
          Install app
        </button>
      )}
      {notifStatus !== "granted" && (
        <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={enableNotifications}>
          Enable notifications
        </button>
      )}
    </div>
  );
}
