"use client";

import { useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { isImagePath, isSvgPath, extOf, formatBytes, byteSize } from "@/lib/fileTypes";

const LANGUAGE_BY_EXT = {
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript", tsx: "typescript", json: "json", jsonc: "json",
  css: "css", scss: "scss", less: "less", html: "html", htm: "html",
  md: "markdown", mdx: "markdown", py: "python", rb: "ruby", go: "go",
  rs: "rust", java: "java", kt: "kotlin", c: "c", h: "c", cpp: "cpp",
  cc: "cpp", hpp: "cpp", cs: "csharp", php: "php", sh: "shell", bash: "shell",
  yml: "yaml", yaml: "yaml", sql: "sql", xml: "xml", toml: "ini", ini: "ini",
};

function languageFromPath(path) {
  return LANGUAGE_BY_EXT[extOf(path)] || "plaintext";
}

export default function CodeEditor({ path, file, onChange, settings, editorRef, onDownloadFile }) {
  const [previewMode, setPreviewMode] = useState("edit");

  if (!path) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--paper-dim)",
          fontSize: 14,
        }}
      >
        Select or upload a file to start editing.
      </div>
    );
  }

  if (isImagePath(path) && !isSvgPath(path)) {
    return <ImagePreview path={path} file={file} onDownloadFile={onDownloadFile} />;
  }

  const ext = extOf(path);
  const canPreview =
    ext === "md" || ext === "mdx" || ext === "csv" || ext === "json" || ext === "jsonc" || ext === "svg";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <span className="mono-label" style={{ marginRight: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {path}
        </span>
        {canPreview && (
          <button className="btn" style={btnSm} onClick={() => setPreviewMode((m) => (m === "edit" ? "preview" : "edit"))}>
            {previewMode === "edit" ? "Preview" : "Edit"}
          </button>
        )}
        {previewMode === "edit" && (
          <>
            <button className="btn" style={btnSm} title="Undo" onClick={() => editorRef?.current?.trigger("", "undo")}>
              ↺
            </button>
            <button className="btn" style={btnSm} title="Redo" onClick={() => editorRef?.current?.trigger("", "redo")}>
              ↻
            </button>
            <button
              className="btn"
              style={btnSm}
              title="Format document"
              onClick={() => editorRef?.current?.getAction("editor.action.formatDocument")?.run()}
            >
              Format
            </button>
          </>
        )}
        {onDownloadFile && (
          <button className="btn" style={btnSm} onClick={() => onDownloadFile(path)}>
            Download
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {previewMode === "preview" && (ext === "md" || ext === "mdx") && <MarkdownPreview content={file?.content || ""} />}
        {previewMode === "preview" && ext === "csv" && <CsvPreview content={file?.content || ""} />}
        {previewMode === "preview" && (ext === "json" || ext === "jsonc") && <JsonPreview content={file?.content || ""} />}
        {previewMode === "preview" && ext === "svg" && <SvgPreview content={file?.content || ""} />}
        {previewMode === "edit" && (
          <MonacoEditor
            height="100%"
            theme={settings?.theme === "light" ? "vs" : "vs-dark"}
            path={path}
            language={languageFromPath(path)}
            value={file?.content || ""}
            onChange={(v) => onChange(v ?? "")}
            onMount={(editor) => {
              if (editorRef) editorRef.current = editor;
            }}
            options={{
              fontFamily: "var(--font-mono-family), monospace",
              fontSize: settings?.fontSize || 14,
              tabSize: settings?.tabSize || 2,
              minimap: { enabled: Boolean(settings?.minimap) },
              wordWrap: settings?.wordWrap === false ? "off" : "on",
              lineNumbers: settings?.lineNumbers === false ? "off" : "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: "4px 10px",
          fontSize: 11,
          color: "var(--paper-dim)",
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <span>{languageFromPath(path)}</span>
        <span>{formatBytes(byteSize(file))}</span>
      </div>
    </div>
  );
}

const btnSm = { padding: "4px 9px", fontSize: 11 };

function ImagePreview({ path, file, onDownloadFile }) {
  const ext = extOf(path);
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const src = file?.encoding === "base64" && file?.content ? `data:${mime};base64,${file.content}` : null;
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 20,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={path} style={{ maxWidth: "100%", maxHeight: "70%", borderRadius: 8, border: "1px solid var(--line)" }} />
      ) : (
        <p style={{ color: "var(--paper-dim)" }}>Can&apos;t preview this image.</p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p className="mono-label">
          {path} · {formatBytes(byteSize(file))}
        </p>
        {onDownloadFile && (
          <button className="btn" style={btnSm} onClick={() => onDownloadFile(path)}>
            Download
          </button>
        )}
      </div>
    </div>
  );
}

function Heading({ level, children }) {
  const style = { color: "var(--paper)", marginTop: 16, marginBottom: 8 };
  if (level === 1) return <h1 style={{ ...style, fontSize: 26 }}>{children}</h1>;
  if (level === 2) return <h2 style={{ ...style, fontSize: 21 }}>{children}</h2>;
  if (level === 3) return <h3 style={{ ...style, fontSize: 18 }}>{children}</h3>;
  return <h4 style={{ ...style, fontSize: 15 }}>{children}</h4>;
}

function renderInline(text, keyBase) {
  const parts = [];
  let remaining = text;
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/;
  let key = 0;
  while (remaining) {
    const m = remaining.match(re);
    if (!m) {
      parts.push(remaining);
      break;
    }
    if (m.index > 0) parts.push(remaining.slice(0, m.index));
    if (m[2] !== undefined) parts.push(<strong key={`${keyBase}-${key++}`}>{m[2]}</strong>);
    else if (m[3] !== undefined)
      parts.push(
        <code key={`${keyBase}-${key++}`} style={{ background: "var(--ink)", padding: "1px 5px", borderRadius: 4 }}>
          {m[3]}
        </code>
      );
    else if (m[4] !== undefined) parts.push(<em key={`${keyBase}-${key++}`}>{m[4]}</em>);
    remaining = remaining.slice(m.index + m[0].length);
  }
  return parts;
}

/** Deliberately minimal, dependency-free markdown preview - headers, lists, code fences, bold/italic/code. Not a full CommonMark parser. */
function MarkdownPreview({ content }) {
  const lines = content.split("\n");
  const out = [];
  let inCode = false;
  let codeBuf = [];

  lines.forEach((line, i) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(
          <pre key={i} style={{ background: "var(--ink)", padding: 12, borderRadius: 8, overflow: "auto" }}>
            <code>{codeBuf.join("\n")}</code>
          </pre>
        );
        codeBuf = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      out.push(
        <Heading key={i} level={h[1].length}>
          {renderInline(h[2], i)}
        </Heading>
      );
      return;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      out.push(
        <div key={i} style={{ paddingLeft: 16, color: "var(--paper-dim)" }}>
          • {renderInline(line.replace(/^\s*[-*]\s+/, ""), i)}
        </div>
      );
      return;
    }
    if (!line.trim()) {
      out.push(<div key={i} style={{ height: 8 }} />);
      return;
    }
    out.push(
      <p key={i} style={{ color: "var(--paper-dim)" }}>
        {renderInline(line, i)}
      </p>
    );
  });

  return <div style={{ padding: 20, overflow: "auto", height: "100%", lineHeight: 1.6 }}>{out}</div>;
}

/** Simple comma-split preview, not a full RFC4180 CSV parser (no quoted-comma handling). */
function CsvPreview({ content }) {
  const rows = content
    .split("\n")
    .filter((r) => r.length)
    .slice(0, 200)
    .map((r) => r.split(","));
  if (!rows.length) return <p style={{ padding: 20, color: "var(--paper-dim)" }}>Empty file.</p>;
  const [header, ...body] = rows;
  return (
    <div style={{ padding: 20, overflow: "auto", height: "100%" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid var(--line)", color: "var(--paper)" }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "6px 10px", borderBottom: "1px solid var(--line)", color: "var(--paper-dim)" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JsonPreview({ content }) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return <div style={{ padding: 20, color: "var(--diff-remove)" }}>Invalid JSON: {err.message}</div>;
  }
  return (
    <div style={{ padding: 20, overflow: "auto", height: "100%", fontFamily: "var(--font-mono)", fontSize: 13 }}>
      <JsonNode value={parsed} />
    </div>
  );
}

function SvgPreview({ content }) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(content)}`;
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="SVG preview" style={{ maxWidth: "100%", maxHeight: "100%" }} />
    </div>
  );
}

function JsonNode({ value, indent = 0 }) {
  if (value === null) return <span style={{ color: "var(--paper-dim)" }}>null</span>;
  if (Array.isArray(value)) {
    return (
      <div>
        {value.map((v, i) => (
          <div key={i} style={{ paddingLeft: indent * 14 }}>
            <span style={{ color: "var(--paper-dim)" }}>[{i}]</span> <JsonNode value={v} indent={indent + 1} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <div>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} style={{ paddingLeft: indent * 14 }}>
            <span style={{ color: "var(--amber)" }}>{k}</span>:{" "}
            {typeof v === "object" && v !== null ? <JsonNode value={v} indent={indent + 1} /> : <JsonNode value={v} />}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "string") return <span style={{ color: "var(--diff-add)" }}>&quot;{value}&quot;</span>;
  return <span style={{ color: "#7bb3e0" }}>{String(value)}</span>;
}
