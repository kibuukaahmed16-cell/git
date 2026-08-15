"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

const SECTIONS = ["settings", "history", "stashes", "share", "stats", "feedback", "account"];

const inputStyle = {
  background: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "7px 9px",
  color: "var(--paper)",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  width: "100%",
};

const btnSm = { padding: "5px 10px", fontSize: 12 };
const label = { fontSize: 12, color: "var(--paper-dim)", display: "block", margin: "10px 0 4px" };

export default function ToolsPanel({ repo, branch, files, onFilesReplace }) {
  const [section, setSection] = useState("settings");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 4, padding: 8, flexWrap: "wrap", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="btn"
            style={{ ...btnSm, ...(section === s ? { borderColor: "var(--amber)", color: "var(--amber)" } : {}) }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {section === "settings" && <SettingsSection />}
        {section === "history" && <HistorySection repo={repo} branch={branch} onFilesReplace={onFilesReplace} />}
        {section === "stashes" && <StashesSection repo={repo} files={files} onFilesReplace={onFilesReplace} />}
        {section === "share" && <ShareSection repo={repo} files={files} />}
        {section === "stats" && <StatsSection />}
        {section === "feedback" && <FeedbackSection />}
        {section === "account" && <AccountSection />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------

function SettingsSection() {
  const notify = useToast();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => notify("Couldn't load settings", { type: "error" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(update) {
    setSettings((s) => ({ ...s, ...update }));
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    } catch (err) {
      notify(`Couldn't save: ${err.message}`, { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <Muted>Loading settings…</Muted>;

  return (
    <div>
      <p className="mono-label" style={{ marginBottom: 4 }}>
        Editor
      </p>
      <label style={label}>Theme</label>
      <select style={inputStyle} value={settings.theme} onChange={(e) => patch({ theme: e.target.value })}>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>

      <label style={label}>Font size ({settings.fontSize}px)</label>
      <input
        type="range"
        min={10}
        max={24}
        value={settings.fontSize}
        onChange={(e) => patch({ fontSize: Number(e.target.value) })}
        style={{ width: "100%" }}
      />

      <label style={label}>Tab size</label>
      <select style={inputStyle} value={settings.tabSize} onChange={(e) => patch({ tabSize: Number(e.target.value) })}>
        <option value={2}>2 spaces</option>
        <option value={4}>4 spaces</option>
        <option value={8}>8 spaces</option>
      </select>

      <Toggle label="Word wrap" checked={settings.wordWrap} onChange={(v) => patch({ wordWrap: v })} />
      <Toggle label="Line numbers" checked={settings.lineNumbers} onChange={(v) => patch({ lineNumbers: v })} />
      <Toggle label="Minimap" checked={settings.minimap} onChange={(v) => patch({ minimap: v })} />
      <Toggle label="Show hidden files (dotfiles)" checked={settings.showHiddenFiles} onChange={(v) => patch({ showHiddenFiles: v })} />

      <p className="mono-label" style={{ margin: "18px 0 4px" }}>
        Git defaults
      </p>
      <label style={label}>Default branch</label>
      <input style={inputStyle} value={settings.defaultBranch} onChange={(e) => setSettings((s) => ({ ...s, defaultBranch: e.target.value }))} onBlur={(e) => patch({ defaultBranch: e.target.value })} />
      <label style={label}>Commit message template</label>
      <input
        style={inputStyle}
        value={settings.commitMessageTemplate}
        onChange={(e) => setSettings((s) => ({ ...s, commitMessageTemplate: e.target.value }))}
        onBlur={(e) => patch({ commitMessageTemplate: e.target.value })}
      />

      <p className="mono-label" style={{ margin: "18px 0 4px" }}>
        Notifications
      </p>
      <Toggle label="Email me on push success" checked={settings.emailOnPushSuccess} onChange={(v) => patch({ emailOnPushSuccess: v })} />
      <Toggle label="Email me on push failure" checked={settings.emailOnPushFailure} onChange={(v) => patch({ emailOnPushFailure: v })} />
      <Toggle label="Email me on new sign-in" checked={settings.emailOnSignIn} onChange={(v) => patch({ emailOnSignIn: v })} />
      <Toggle label="Email me at push milestones" checked={settings.emailMilestones} onChange={(v) => patch({ emailMilestones: v })} />
      <Toggle label="Weekly activity digest" checked={settings.emailWeeklyDigest} onChange={(v) => patch({ emailWeeklyDigest: v })} />
      <Toggle label="Monthly report" checked={settings.emailMonthlyReport} onChange={(v) => patch({ emailMonthlyReport: v })} />
      <Toggle label="Re-engagement email after a month idle" checked={settings.emailReEngagement} onChange={(v) => patch({ emailReEngagement: v })} />
      <Toggle label="Remind me about old stashes" checked={settings.emailStashReminders} onChange={(v) => patch({ emailStashReminders: v })} />

      <label style={label}>Slack webhook URL (optional)</label>
      <input
        style={inputStyle}
        placeholder="https://hooks.slack.com/services/…"
        value={settings.slackWebhookUrl}
        onChange={(e) => setSettings((s) => ({ ...s, slackWebhookUrl: e.target.value }))}
        onBlur={(e) => patch({ slackWebhookUrl: e.target.value })}
      />
      <label style={label}>Discord webhook URL (optional)</label>
      <input
        style={inputStyle}
        placeholder="https://discord.com/api/webhooks/…"
        value={settings.discordWebhookUrl}
        onChange={(e) => setSettings((s) => ({ ...s, discordWebhookUrl: e.target.value }))}
        onBlur={(e) => patch({ discordWebhookUrl: e.target.value })}
      />
      {saving && <Muted style={{ marginTop: 10 }}>Saving…</Muted>}
    </div>
  );
}

function Toggle({ label: text, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: "var(--paper-dim)", cursor: "pointer" }}>
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      {text}
    </label>
  );
}

// ---------------------------------------------------------------

function HistorySection({ repo, branch, onFilesReplace }) {
  const notify = useToast();
  const [commits, setCommits] = useState(null);
  const [pushes, setPushes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setPushes(d.recentPushes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!repo) {
      setCommits([]);
      return;
    }
    const qs = new URLSearchParams({ repo, ...(branch ? { branch } : {}) });
    fetch(`/api/commits?${qs}`)
      .then((r) => r.json())
      .then((d) => setCommits(d.commits || []))
      .catch(() => setCommits([]));
  }, [repo, branch]);

  async function restore(sha) {
    if (!repo) return;
    if (!confirm(`Load the files from commit ${sha.slice(0, 7)} into the editor? This replaces what's currently open.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/fetch-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, ref: sha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFilesReplace(data.files);
      notify(`Restored ${data.files.length} file(s) from ${sha.slice(0, 7)}`, { type: "success" });
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mono-label" style={{ marginBottom: 8 }}>
        Push history (this workspace)
      </p>
      {pushes === null && <Muted>Loading…</Muted>}
      {pushes?.length === 0 && <Muted>No pushes yet.</Muted>}
      {pushes?.map((p) => (
        <div key={p.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--line)", color: p.success ? "var(--diff-add)" : "var(--diff-remove)" }}>
          {p.success ? "✓" : "✗"} {p.repoFullName} ({p.branch}) · {new Date(p.createdAt).toLocaleString()}
        </div>
      ))}

      <p className="mono-label" style={{ margin: "18px 0 8px" }}>
        Commits {repo ? `on ${repo}` : ""}
      </p>
      {!repo && <Muted>Pick a repo in the push bar to see its commit history.</Muted>}
      {repo && commits === null && <Muted>Loading…</Muted>}
      {repo && commits?.length === 0 && <Muted>No commits found.</Muted>}
      {commits?.map((c) => (
        <div key={c.sha} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 13, color: "var(--paper)" }}>{c.message.split("\n")[0]}</div>
          <div style={{ fontSize: 11, color: "var(--paper-dim)", display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span>
              {c.shortSha} · {c.authorName} · {new Date(c.date).toLocaleDateString()}
            </span>
            <button className="btn" style={btnSm} disabled={busy} onClick={() => restore(c.sha)}>
              Restore
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------

function StashesSection({ repo, files, onFilesReplace }) {
  const notify = useToast();
  const [stashes, setStashes] = useState(null);
  const [label_, setLabel] = useState("");

  function refresh() {
    fetch("/api/stash")
      .then((r) => r.json())
      .then((d) => setStashes(d.stashes || []))
      .catch(() => setStashes([]));
  }

  useEffect(refresh, []);

  async function save() {
    if (!files.length) return notify("Nothing to stash yet", { type: "error" });
    try {
      const res = await fetch("/api/stash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: repo, label: label_.trim() || "Untitled stash", files }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setLabel("");
      notify("Stashed", { type: "success" });
      refresh();
    } catch (err) {
      notify(err.message, { type: "error" });
    }
  }

  async function restore(id) {
    if (!confirm("Load this stash into the editor? This replaces what's currently open.")) return;
    try {
      const res = await fetch(`/api/stash?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFilesReplace(data.files);
      notify("Stash restored", { type: "success" });
    } catch (err) {
      notify(err.message, { type: "error" });
    }
  }

  async function remove(id) {
    await fetch("/api/stash", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    refresh();
  }

  return (
    <div>
      <p className="mono-label" style={{ marginBottom: 8 }}>
        Save current workspace
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={inputStyle} placeholder="Stash label" value={label_} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn" style={btnSm} onClick={save}>
          Stash
        </button>
      </div>

      <p className="mono-label" style={{ margin: "18px 0 8px" }}>
        Saved stashes
      </p>
      {stashes === null && <Muted>Loading…</Muted>}
      {stashes?.length === 0 && <Muted>No stashes yet.</Muted>}
      {stashes?.map((s) => (
        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 12 }}>
          <span>
            {s.label} <span style={{ color: "var(--paper-dim)" }}>· {s.fileCount} files</span>
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn" style={btnSm} onClick={() => restore(s.id)}>
              Restore
            </button>
            <button className="btn" style={btnSm} onClick={() => remove(s.id)}>
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------

function ShareSection({ repo, files }) {
  const notify = useToast();
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!files.length) return notify("Nothing to share yet", { type: "error" });
    setBusy(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: repo, files }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLink(`${window.location.origin}/share/${data.token}`);
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Muted>Creates a read-only link to the files currently open here. Anyone with the link can view them (not edit) for 14 days.</Muted>
      <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={create}>
        {busy ? "Creating…" : "Create share link"}
      </button>
      {link && (
        <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
          <input readOnly value={link} style={inputStyle} onFocus={(e) => e.target.select()} />
          <button
            className="btn"
            style={btnSm}
            onClick={() => {
              navigator.clipboard?.writeText(link);
              notify("Copied", { type: "success" });
            }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------

function StatsSection() {
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ stats: null }));
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => setLeaderboard([]));
  }, []);

  if (!data) return <Muted>Loading…</Muted>;
  const s = data.stats;
  if (!s) return <Muted>Couldn&apos;t load stats.</Muted>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatBox label="Current streak" value={`${s.currentStreak}d`} />
        <StatBox label="Longest streak" value={`${s.longestStreak}d`} />
        <StatBox label="Total pushes" value={s.totalPushes} />
        <StatBox label="Repos touched" value={s.repoCount} />
      </div>

      {s.badges.length > 0 && (
        <>
          <p className="mono-label" style={{ marginBottom: 8 }}>
            Badges
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {s.badges.map((b) => (
              <span key={b.id} className="btn" style={{ ...btnSm, borderColor: "var(--amber)", color: "var(--amber)" }}>
                🏅 {b.label}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="mono-label" style={{ marginBottom: 8 }}>
        Last 90 days
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(15, 1fr)", gap: 3 }}>
        {s.graph.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} push(es)`}
            style={{
              aspectRatio: "1",
              borderRadius: 2,
              background: d.count === 0 ? "var(--line)" : d.count < 3 ? "var(--amber-soft)" : "var(--amber)",
            }}
          />
        ))}
      </div>

      {leaderboard?.length > 0 && (
        <>
          <p className="mono-label" style={{ margin: "18px 0 8px" }}>
            Leaderboard (this instance)
          </p>
          {leaderboard.map((row, i) => (
            <div key={row.githubUsername + i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--line)" }}>
              <span style={{ color: "var(--paper-dim)" }}>
                #{i + 1} {row.githubUsername}
              </span>
              <span style={{ color: "var(--amber)" }}>{row.pushCount}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function StatBox({ label: text, value }) {
  return (
    <div className="card" style={{ padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--amber)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--paper-dim)" }}>{text}</div>
    </div>
  );
}

// ---------------------------------------------------------------

function FeedbackSection() {
  const notify = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage("");
      notify("Thanks - sent.", { type: "success" });
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <Muted>Bugs, ideas, anything - goes straight to the person running this instance.</Muted>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        style={{ ...inputStyle, marginTop: 10, resize: "vertical" }}
        placeholder="What's on your mind?"
      />
      <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={sending || !message.trim()} onClick={send}>
        {sending ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------

function AccountSection() {
  const notify = useToast();
  const [deleting, setDeleting] = useState(false);

  async function exportData() {
    window.location.href = "/api/gdpr/export";
  }

  async function deleteAccount() {
    if (!confirm("This permanently deletes your T3RRI HUB account and all data stored here (not your GitHub account, and not your repos). Continue?")) return;
    if (prompt('Type DELETE to confirm') !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/gdpr/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      notify("Account deleted. Signing you out…", { type: "success" });
      setTimeout(() => (window.location.href = "/"), 1200);
    } catch (err) {
      notify(err.message, { type: "error" });
      setDeleting(false);
    }
  }

  return (
    <div>
      <p className="mono-label" style={{ marginBottom: 8 }}>
        Your data
      </p>
      <Muted>Export everything T3RRI HUB has stored about you, or delete your account and data entirely.</Muted>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn" style={btnSm} onClick={exportData}>
          Export my data
        </button>
        <button className="btn" style={{ ...btnSm, borderColor: "var(--diff-remove)", color: "var(--diff-remove)" }} disabled={deleting} onClick={deleteAccount}>
          Delete account
        </button>
      </div>
    </div>
  );
}

function Muted({ children, style }) {
  return (
    <p style={{ fontSize: 12, color: "var(--paper-dim)", ...style }}>{children}</p>
  );
}
