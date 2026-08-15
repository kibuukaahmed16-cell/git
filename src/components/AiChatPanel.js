"use client";

import { useState } from "react";

const QUICK_ACTIONS = [
  ["explain", "Explain"],
  ["refactor", "Refactor"],
  ["tests", "Tests"],
  ["docs", "Docs"],
  ["review", "Review"],
  ["bugs", "Find bugs"],
  ["commitMessage", "Commit msg"],
  ["rename", "Rename"],
];

export default function AiChatPanel({ fileContext, filePaths }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);

  async function send() {
    if (!input.trim() || busy) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    await ask({ message: question, fileContext: includeContext ? fileContext : null });
  }

  async function runQuickAction(mode, label) {
    if (busy) return;
    if (!fileContext?.trim()) {
      setMessages((m) => [...m, { role: "ai", text: "Open a file first - this tool works on whatever's in the editor." }]);
      return;
    }
    setMessages((m) => [...m, { role: "user", text: `[${label}]` }]);
    await ask({ mode, fileContext });
  }

  async function runStructureAction() {
    if (busy) return;
    if (!filePaths?.length) {
      setMessages((m) => [...m, { role: "ai", text: "Load some files first." }]);
      return;
    }
    setMessages((m) => [...m, { role: "user", text: "[Project structure]" }]);
    await ask({ mode: "structure", filePaths });
  }

  async function ask(body) {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((m) => [...m, { role: "ai", text: data.answer || "No response." }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "ai", text: `T3RRI AI: ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="mono-label">T3RRI AI</span>
        <label style={{ fontSize: 11, color: "var(--paper-dim)", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
          use open file
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
        {QUICK_ACTIONS.map(([mode, label]) => (
          <button key={mode} className="btn" style={{ padding: "4px 8px", fontSize: 11 }} disabled={busy} onClick={() => runQuickAction(mode, label)}>
            {label}
          </button>
        ))}
        <button className="btn" style={{ padding: "4px 8px", fontSize: 11 }} disabled={busy} onClick={runStructureAction}>
          Project structure
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--paper-dim)" }}>Ask about the file you have open, run a quick action above, or ask anything else.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ fontSize: 13 }}>
            <strong style={{ display: "block", fontSize: 11, opacity: 0.7, marginBottom: 2, color: "var(--paper-dim)" }}>
              {m.role === "user" ? "you" : "t3rri ai"}
            </strong>
            <span style={{ color: "var(--paper)", whiteSpace: "pre-wrap" }}>{m.text}</span>
          </div>
        ))}
        {busy && <p style={{ fontSize: 13, color: "var(--paper-dim)" }}>Thinking…</p>}
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask T3RRI AI…"
          style={{
            flex: 1,
            background: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "8px 10px",
            color: "var(--paper)",
            fontSize: 13,
          }}
        />
        <button className="btn btn-primary" style={{ padding: "8px 14px" }} onClick={send} disabled={busy}>
          Send
        </button>
      </div>
    </div>
  );
}
