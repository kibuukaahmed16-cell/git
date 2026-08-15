"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

const inputStyle = {
  background: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "var(--paper)",
  fontSize: 14,
  fontFamily: "var(--font-mono)",
};

export default function CommitBar({
  files,
  disabled,
  repo,
  branch,
  onRepoChange,
  onBranchChange,
  onFilesReplace,
  defaultCommitMessage,
  onPushed,
}) {
  const notify = useToast();
  const [message, setMessage] = useState(defaultCommitMessage || "Update via T3RRI HUB");
  const [status, setStatus] = useState("idle"); // idle | pushing | success | error | conflict
  const [error, setError] = useState("");
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [newBranchMode, setNewBranchMode] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (disabled) return;
    fetch("/api/repos")
      .then((r) => r.json())
      .then((d) => setRepos(d.repos || []))
      .catch(() => {});
  }, [disabled]);

  useEffect(() => {
    if (!repo) {
      setBranches([]);
      return;
    }
    fetch(`/api/branches?repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .catch(() => setBranches([]));
  }, [repo]);

  useEffect(() => {
    if (defaultCommitMessage) setMessage(defaultCommitMessage);
  }, [defaultCommitMessage]);

  async function push(force = false) {
    setStatus("pushing");
    setError("");
    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          repoFullName: repo.trim(),
          branch: branch.trim() || "main",
          commitMessage: message,
          force,
        }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setStatus("error");
        setError(data.error);
        return;
      }
      if (res.status === 409 && data.error === "REMOTE_AHEAD") {
        setStatus("conflict");
        setError(data.message);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Push failed");

      setStatus("success");
      onPushed?.();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  async function fetchLatest() {
    if (!repo || !branch) return;
    if (files.length && !confirm(`Load the latest "${branch}" from ${repo}? This replaces what's currently open.`)) return;
    setFetching(true);
    try {
      const res = await fetch("/api/fetch-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, ref: branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFilesReplace(data.files);
      notify(`Loaded ${data.files.length} file(s) from ${repo}@${branch}`, { type: "success" });
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setFetching(false);
    }
  }

  async function createBranch() {
    if (!repo || !newBranchName.trim() || !branch) return;
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, newBranch: newBranchName.trim(), fromBranch: branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const name = newBranchName.trim();
      setBranches((b) => [...b, { name }]);
      onBranchChange(name);
      setNewBranchName("");
      setNewBranchMode(false);
      notify(`Created branch ${name}`, { type: "success" });
    } catch (err) {
      notify(err.message, { type: "error" });
    }
  }

  return (
    <div className="card" style={{ margin: 12, padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <input
        list="repo-list"
        placeholder="owner/repo"
        value={repo}
        onChange={(e) => onRepoChange(e.target.value)}
        style={{ ...inputStyle, minWidth: 160 }}
      />
      <datalist id="repo-list">
        {repos.map((r) => (
          <option key={r.fullName} value={r.fullName} />
        ))}
      </datalist>

      {branches.length > 0 ? (
        <select value={branch} onChange={(e) => onBranchChange(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      ) : (
        <input placeholder="branch" value={branch} onChange={(e) => onBranchChange(e.target.value)} style={{ ...inputStyle, width: 100 }} />
      )}

      <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setNewBranchMode((v) => !v)} disabled={!repo}>
        + Branch
      </button>
      <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={fetchLatest} disabled={!repo || !branch || fetching}>
        {fetching ? "Fetching…" : "Fetch latest"}
      </button>

      {newBranchMode && (
        <div style={{ width: "100%", display: "flex", gap: 6 }}>
          <input
            placeholder="new-branch-name"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={createBranch}>
            Create from {branch}
          </button>
        </div>
      )}

      <input
        placeholder="Commit message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ ...inputStyle, flex: 1, minWidth: 160 }}
      />
      <button
        className="btn btn-primary"
        disabled={disabled || !repo.trim() || !files.length || status === "pushing"}
        onClick={() => push(false)}
      >
        {status === "pushing" ? "Pushing…" : "Push"}
      </button>

      {status === "conflict" && (
        <div style={{ width: "100%", fontSize: 13, color: "var(--diff-remove)" }}>
          {error}{" "}
          <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => push(true)}>
            Push anyway (force)
          </button>
        </div>
      )}
      {status === "error" && <p style={{ width: "100%", fontSize: 13, color: "var(--diff-remove)" }}>{error}</p>}
      {status === "success" && <p style={{ width: "100%", fontSize: 13, color: "var(--diff-add)" }}>Pushed.</p>}
      {disabled && (
        <p style={{ width: "100%", fontSize: 12, color: "var(--paper-dim)" }}>Sign in with GitHub (not just Google) to push.</p>
      )}
    </div>
  );
}
