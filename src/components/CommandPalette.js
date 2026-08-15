"use client";

import { useEffect, useMemo, useState } from "react";
import { iconFor } from "@/lib/fileTypes";

const SHORTCUTS = [
  ["Ctrl / Cmd + P", "Quick open a file"],
  ["Ctrl / Cmd + Shift + F", "Search across loaded files"],
  ["Ctrl / Cmd + Z / Y", "Undo / redo in the editor"],
  ["?", "Show this list"],
  ["Esc", "Close this or any panel"],
];

export default function CommandPalette({ files, onSelect, onReplaceAll }) {
  const [mode, setMode] = useState(null); // null | "open" | "search" | "help"
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");

  useEffect(() => {
    function onKeyDown(e) {
      const cmd = e.metaKey || e.ctrlKey;
      const inField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);

      if (cmd && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setMode("open");
        setQuery("");
      } else if (cmd && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setMode("search");
        setQuery("");
      } else if (e.key === "?" && !cmd && !inField) {
        e.preventDefault();
        setMode("help");
      } else if (e.key === "Escape") {
        setMode(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openResults = useMemo(() => {
    if (mode !== "open") return [];
    const q = query.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 40);
  }, [files, query, mode]);

  const searchResults = useMemo(() => {
    if (mode !== "search" || query.length < 2) return [];
    const q = query.toLowerCase();
    const hits = [];
    outer: for (const f of files) {
      if (f.encoding === "base64") continue;
      const lines = (f.content || "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          hits.push({ path: f.path, line: i + 1, text: lines[i].trim().slice(0, 120) });
          if (hits.length >= 200) break outer;
        }
      }
    }
    return hits;
  }, [files, query, mode]);

  if (!mode) return null;

  return (
    <div
      onClick={() => setMode(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: "min(560px, 92vw)", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {mode === "help" ? (
          <div style={{ padding: 16 }}>
            <p className="mono-label" style={{ marginBottom: 10 }}>
              Keyboard shortcuts
            </p>
            {SHORTCUTS.map(([key, desc]) => (
              <div
                key={key}
                style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--line)", gap: 12 }}
              >
                <code style={{ color: "var(--amber)", flexShrink: 0 }}>{key}</code>
                <span style={{ color: "var(--paper-dim)", textAlign: "right" }}>{desc}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "open" ? "Quick open a file…" : "Search across loaded files…"}
              style={{
                padding: 14,
                fontSize: 15,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                color: "var(--paper)",
                outline: "none",
              }}
            />
            <div style={{ overflowY: "auto" }}>
              {mode === "open" &&
                openResults.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => {
                      onSelect(f.path);
                      setMode(null);
                    }}
                    className="mono-label"
                    style={{
                      display: "flex",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 14px",
                      background: "transparent",
                      border: "none",
                      color: "var(--paper-dim)",
                      cursor: "pointer",
                      fontSize: 13,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    <span>{iconFor(f.path)}</span> {f.path}
                  </button>
                ))}
              {mode === "open" && query && !openResults.length && (
                <p style={{ padding: 14, fontSize: 13, color: "var(--paper-dim)" }}>No matching files.</p>
              )}

              {mode === "search" && (
                <>
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSelect(r.path);
                        setMode(null);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--line)",
                        cursor: "pointer",
                      }}
                    >
                      <div className="mono-label" style={{ fontSize: 12, color: "var(--amber)", textTransform: "none" }}>
                        {r.path}:{r.line}
                      </div>
                      <div className="mono-label" style={{ fontSize: 12, color: "var(--paper-dim)", textTransform: "none" }}>
                        {r.text}
                      </div>
                    </button>
                  ))}
                  {query.length >= 2 && onReplaceAll && (
                    <div style={{ padding: 12, display: "flex", gap: 8, borderTop: "1px solid var(--line)" }}>
                      <input
                        placeholder="Replace with…"
                        value={replacement}
                        onChange={(e) => setReplacement(e.target.value)}
                        style={{
                          flex: 1,
                          background: "var(--ink)",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          padding: "6px 9px",
                          color: "var(--paper)",
                          fontSize: 13,
                        }}
                      />
                      <button
                        className="btn"
                        style={{ padding: "6px 10px", fontSize: 12, whiteSpace: "nowrap" }}
                        onClick={() => {
                          onReplaceAll(query, replacement);
                          setMode(null);
                        }}
                      >
                        Replace all ({searchResults.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
