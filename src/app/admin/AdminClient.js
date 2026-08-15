"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FEATURE_FLAG_LABELS } from "@/lib/featureFlagLabels";

const card = { padding: 16, marginBottom: 16 };
const btnSm = { padding: "5px 10px", fontSize: 12 };

export default function AdminClient() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>T3RRI HUB · Admin</span>
        <Link href="/dashboard" className="btn" style={btnSm}>
          Back to dashboard
        </Link>
      </header>
      <main className="container" style={{ padding: "24px", maxWidth: 800 }}>
        <Overview />
        <Announcement />
        <Broadcast />
        <Flags />
        <Feedback />
      </main>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => setData(d.overview))
      .catch(() => {});
  }, []);

  return (
    <section className="card" style={card}>
      <h3 style={{ color: "var(--paper)", marginBottom: 10 }}>Overview</h3>
      {!data && <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>Loading…</p>}
      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <Stat label="Users" value={data.userCount} />
            <Stat label="Pushes" value={data.pushCount} />
            <Stat label="Push success" value={data.pushSuccessRate !== null ? `${data.pushSuccessRate}%` : "—"} />
            <Stat label="Open feedback" value={data.feedbackOpenCount} />
          </div>
          <p style={{ marginTop: 14, fontSize: 12, color: "var(--paper-dim)" }}>Route usage</p>
          <div style={{ fontSize: 12, color: "var(--paper-dim)", fontFamily: "var(--font-mono)" }}>
            {Object.entries(data.routeUsage || {}).map(([route, count]) => (
              <div key={route} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>{route}</span>
                <span>{count}</span>
              </div>
            ))}
            {Object.keys(data.routeUsage || {}).length === 0 && <span>No traffic recorded yet.</span>}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--amber)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--paper-dim)" }}>{label}</div>
    </div>
  );
}

function Announcement() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((d) => setText(d.announcement?.text || ""))
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/announcement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={card}>
      <h3 style={{ color: "var(--paper)", marginBottom: 10 }}>Site-wide announcement</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Leave empty to hide the banner"
        style={{ width: "100%", background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: 9, color: "var(--paper)", fontSize: 13 }}
      />
      <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save"}
      </button>
    </section>
  );
}

function Broadcast() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  async function send() {
    if (!message.trim()) return;
    if (!confirm("Send this email to every user who has an email on file? This can't be undone.")) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(`Sent to ${data.sent}/${data.total} users.`);
      setSubject("");
      setMessage("");
    } catch (err) {
      setResult(`Failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card" style={card}>
      <h3 style={{ color: "var(--paper)", marginBottom: 10 }}>Email everyone</h3>
      <p style={{ fontSize: 12, color: "var(--paper-dim)", marginBottom: 8 }}>
        For feature announcements or beta invites - goes to every user with an email on file, right away (not scheduled).
      </p>
      <input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        style={{ width: "100%", marginBottom: 8, background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: 9, color: "var(--paper)", fontSize: 13 }}
      />
      <textarea
        placeholder="Message (basic HTML is fine)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        style={{ width: "100%", background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: 9, color: "var(--paper)", fontSize: 13, resize: "vertical" }}
      />
      <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={sending || !message.trim()} onClick={send}>
        {sending ? "Sending…" : "Send to all users"}
      </button>
      {result && <p style={{ marginTop: 8, fontSize: 12, color: "var(--paper-dim)" }}>{result}</p>}
    </section>
  );
}

function Flags() {
  const [flags, setFlags] = useState(null);

  function refresh() {
    fetch("/api/admin/flags")
      .then((r) => r.json())
      .then((d) => setFlags(d.flags))
      .catch(() => {});
  }
  useEffect(refresh, []);

  async function toggle(key, value) {
    setFlags((f) => ({ ...f, [key]: value }));
    await fetch("/api/admin/flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  return (
    <section className="card" style={card}>
      <h3 style={{ color: "var(--paper)", marginBottom: 10 }}>Feature flags</h3>
      {!flags && <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>Loading…</p>}
      {flags &&
        Object.keys(flags).map((key) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: "var(--paper-dim)" }}>
            <input type="checkbox" checked={Boolean(flags[key])} onChange={(e) => toggle(key, e.target.checked)} />
            {FEATURE_FLAG_LABELS[key] || key}
          </label>
        ))}
    </section>
  );
}

function Feedback() {
  const [items, setItems] = useState(null);

  function refresh() {
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((d) => setItems(d.feedback))
      .catch(() => {});
  }
  useEffect(refresh, []);

  async function setStatus(id, status) {
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    refresh();
  }

  return (
    <section className="card" style={card}>
      <h3 style={{ color: "var(--paper)", marginBottom: 10 }}>Feedback</h3>
      {!items && <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>Loading…</p>}
      {items?.length === 0 && <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>Nothing yet.</p>}
      {items?.map((f) => (
        <div key={f.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
          <p style={{ fontSize: 13, color: "var(--paper)" }}>{f.message}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "var(--paper-dim)" }}>
              {f.email || "anonymous"} · {new Date(f.createdAt).toLocaleString()} · {f.status}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              {f.status !== "resolved" && (
                <button className="btn" style={btnSm} onClick={() => setStatus(f.id, "resolved")}>
                  Mark resolved
                </button>
              )}
              {f.status === "resolved" && (
                <button className="btn" style={btnSm} onClick={() => setStatus(f.id, "open")}>
                  Reopen
                </button>
              )}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
