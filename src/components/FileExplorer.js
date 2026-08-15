"use client";

import { useRef, useState } from "react";
import { iconFor, formatBytes, byteSize } from "@/lib/fileTypes";

async function uploadToServer(fileList) {
  const formData = new FormData();
  for (const file of fileList) {
    formData.append("files", file, file.webkitRelativePath || file.name);
  }
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

function isHiddenPath(path) {
  return path.split("/").some((seg) => seg.startsWith(".") && seg.length > 1);
}

export default function FileExplorer({
  files,
  selectedPath,
  onSelect,
  onFilesAdded,
  onRename,
  onDelete,
  onDownloadFile,
  showHidden = false,
  recentPaths = [],
}) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  async function handleFiles(fileList) {
    if (!fileList?.length) return;
    setBusy(true);
    setError("");
    try {
      const { files: uploaded, warnings } = await uploadToServer(fileList);
      onFilesAdded(uploaded);
      if (warnings?.length) setError(`Heads up: ${warnings[0]}${warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ""}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const visible = files
    .filter((f) => showHidden || !isHiddenPath(f.path))
    .filter((f) => f.path.toLowerCase().includes(filter.toLowerCase()));

  const recentVisible = !filter && recentPaths.filter((p) => files.some((f) => f.path === p)).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          margin: 12,
          padding: 16,
          border: `1px dashed ${dragOver ? "var(--amber)" : "var(--line)"}`,
          borderRadius: 10,
          textAlign: "center",
          fontSize: 13,
          color: "var(--paper-dim)",
        }}
      >
        {busy ? "Uploading…" : "Drag files or a zip here"}
        <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
          <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>
            Files / zip
          </button>
          <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => folderInputRef.current?.click()}>
            Folder
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && <p style={{ margin: "0 12px 12px", fontSize: 12, color: "var(--diff-remove)" }}>{error}</p>}

      {files.length > 0 && (
        <div style={{ padding: "0 12px 8px" }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files…"
            style={{
              width: "100%",
              background: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "6px 9px",
              color: "var(--paper)",
              fontSize: 12,
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
        {files.length === 0 && (
          <p style={{ padding: "0 8px", fontSize: 13, color: "var(--paper-dim)" }}>No files yet. Upload something to start editing.</p>
        )}

        {recentVisible?.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ padding: "4px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--paper-dim)" }}>
              Recent
            </p>
            {recentVisible.map((p) => (
              <FileRow
                key={`recent-${p}`}
                file={files.find((f) => f.path === p)}
                selected={p === selectedPath}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onDownloadFile={onDownloadFile}
                menuFor={menuFor}
                setMenuFor={setMenuFor}
              />
            ))}
          </div>
        )}

        {visible.map((f) => (
          <FileRow
            key={f.path}
            file={f}
            selected={f.path === selectedPath}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            onDownloadFile={onDownloadFile}
            menuFor={menuFor}
            setMenuFor={setMenuFor}
          />
        ))}
        {filter && visible.length === 0 && <p style={{ padding: "0 8px", fontSize: 13, color: "var(--paper-dim)" }}>No matches.</p>}
      </div>
    </div>
  );
}

function FileRow({ file, selected, onSelect, onRename, onDelete, onDownloadFile, menuFor, setMenuFor }) {
  if (!file) return null;
  const open = menuFor === file.path;

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        onClick={() => onSelect(file.path)}
        className="mono-label"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flex: 1,
          textAlign: "left",
          padding: "7px 8px",
          borderRadius: 6,
          border: "none",
          background: selected ? "var(--amber-soft)" : "transparent",
          color: selected ? "var(--amber)" : "var(--paper-dim)",
          cursor: "pointer",
          fontSize: 13,
          textTransform: "none",
          letterSpacing: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
        title={file.path}
      >
        <span>{iconFor(file.path)}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{file.path}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--paper-dim)", flexShrink: 0 }}>{formatBytes(byteSize(file))}</span>
      </button>
      {(onRename || onDelete || onDownloadFile) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuFor(open ? null : file.path);
          }}
          className="btn"
          style={{ padding: "4px 7px", fontSize: 12, marginLeft: 2, flexShrink: 0 }}
        >
          ⋯
        </button>
      )}
      {open && (
        <div
          className="card"
          style={{ position: "absolute", right: 0, top: "100%", zIndex: 20, minWidth: 140, padding: 4 }}
          onMouseLeave={() => setMenuFor(null)}
        >
          {onDownloadFile && (
            <MenuItem
              onClick={() => {
                onDownloadFile(file.path);
                setMenuFor(null);
              }}
            >
              Download
            </MenuItem>
          )}
          {onRename && (
            <MenuItem
              onClick={() => {
                setMenuFor(null);
                const next = prompt("Rename to:", file.path);
                if (next && next.trim() && next.trim() !== file.path) onRename(file.path, next.trim());
              }}
            >
              Rename
            </MenuItem>
          )}
          {onDelete && (
            <MenuItem
              danger
              onClick={() => {
                setMenuFor(null);
                if (confirm(`Delete ${file.path}?`)) onDelete(file.path);
              }}
            >
              Delete
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        background: "transparent",
        border: "none",
        borderRadius: 4,
        color: danger ? "var(--diff-remove)" : "var(--paper)",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
