"use client";

import { useEffect, useState } from "react";

const DIFF_LINES = [
  { type: "remove", text: "clone the repo, fix the node version, configure git" },
  { type: "remove", text: "find a laptop to do it on" },
  { type: "add", text: "open T3RRI HUB on whatever's in your hand" },
  { type: "add", text: "edit the file right there in the browser" },
  { type: "add", text: "push to GitHub" },
];

const COMMIT_MESSAGE = "fix hero copy";

export default function HeroDiffPanel() {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(COMMIT_MESSAGE.slice(0, i));
      if (i >= COMMIT_MESSAGE.length) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card" style={{ overflow: "hidden", fontFamily: "var(--font-mono)" }}>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--line)",
          fontSize: 13,
          color: "var(--paper-dim)",
        }}
      >
        README.md
      </div>

      <div style={{ padding: "14px 0" }}>
        {DIFF_LINES.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "3px 16px",
              fontSize: 14,
              color: line.type === "add" ? "var(--diff-add)" : "var(--diff-remove)",
              background: line.type === "add" ? "var(--diff-add-bg)" : "var(--diff-remove-bg)",
              opacity: 0,
              animation: `diffFadeIn 0.4s ease forwards`,
              animationDelay: `${i * 0.12}s`,
            }}
          >
            <span aria-hidden="true">{line.type === "add" ? "+" : "-"}</span>
            <span style={{ color: "var(--paper)" }}>{line.text}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderTop: "1px solid var(--line)",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--paper-dim)" }}>commit:</span>
        <span style={{ fontSize: 14, color: "var(--paper)" }}>
          {typed}
          <span aria-hidden="true" style={{ animation: "cursorBlink 1s step-end infinite" }}>
            &#9608;
          </span>
        </span>
        <span className="btn btn-primary" style={{ marginLeft: "auto", padding: "6px 14px", fontSize: 13 }}>
          Push to main
        </span>
      </div>

      <style>{`
        @keyframes diffFadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursorBlink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
