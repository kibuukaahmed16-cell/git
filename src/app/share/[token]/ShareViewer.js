"use client";

import { useState } from "react";
import { iconFor, formatBytes, byteSize, isImagePath, isSvgPath, extOf } from "@/lib/fileTypes";

function mimeFor(path) {
  const ext = extOf(path);
  if (ext === "jpg") return "image/jpeg";
  return `image/${ext}`;
}

function imageSrc(file) {
  if (isSvgPath(file.path)) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(file.content || "")}`;
  }
  if (file.encoding === "base64" && file.content) {
    return `data:${mimeFor(file.path)};base64,${file.content}`;
  }
  return null;
}

export default function ShareViewer({ repoFullName, files }) {
  const [selected, setSelected] = useState(files[0]?.path || null);
  const file = files.find((f) => f.path === selected);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
          T3RRI HUB · shared read-only{repoFullName ? ` · ${repoFullName}` : ""}
        </span>
        <span style={{ fontSize: 12, color: "var(--paper-dim)" }}>{files.length} file(s)</span>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", flex: 1, minHeight: 0 }}>
        <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto", padding: 8 }}>
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelected(f.path)}
              className="mono-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                textAlign: "left",
                padding: "7px 8px",
                borderRadius: 6,
                border: "none",
                background: f.path === selected ? "var(--amber-soft)" : "transparent",
                color: f.path === selected ? "var(--amber)" : "var(--paper-dim)",
                cursor: "pointer",
                fontSize: 13,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              <span>{iconFor(f.path)}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</span>
            </button>
          ))}
        </div>
        <div style={{ overflow: "auto" }}>
          {!file && <p style={{ padding: 20, color: "var(--paper-dim)" }}>Select a file.</p>}
          {file && isImagePath(file.path) && imageSrc(file) && (
            <div style={{ padding: 20, textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(file)} alt={file.path} style={{ maxWidth: "100%", borderRadius: 8 }} />
            </div>
          )}
          {file && !(isImagePath(file.path) && imageSrc(file)) && (
            <pre
              style={{
                padding: 20,
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                color: "var(--paper-dim)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {file.content}
            </pre>
          )}
          {file && <div style={{ padding: "0 20px 20px", fontSize: 11, color: "var(--paper-dim)" }}>{formatBytes(byteSize(file))}</div>}
        </div>
      </div>
    </div>
  );
}
