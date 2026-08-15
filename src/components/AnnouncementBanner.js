"use client";

import { useEffect, useState } from "react";

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((d) => setAnnouncement(d.announcement))
      .catch(() => {});
  }, []);

  if (!announcement?.text || dismissed) return null;

  return (
    <div
      style={{
        background: "var(--amber)",
        color: "var(--ink)",
        padding: "8px 16px",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <span>{announcement.text}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ background: "transparent", border: "none", color: "var(--ink)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
      >
        ✕
      </button>
    </div>
  );
}
