"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import CommitBar from "@/components/CommitBar";
import AiChatPanel from "@/components/AiChatPanel";
import ToolsPanel from "@/components/ToolsPanel";
import CommandPalette from "@/components/CommandPalette";
import InstallAndNotify from "@/components/InstallAndNotify";
import Confetti from "@/components/Confetti";
import { ToastProvider, useToast } from "@/components/Toast";

const DRAFT_KEY = "t3rri-hub-draft-v1";
const RECENT_KEY = "t3rri-hub-recent-v1";
const INACTIVITY_MS = 45 * 60 * 1000; // 45 minutes with no interaction
const MILESTONES = new Set([1, 10, 25, 50, 100, 250, 500, 1000]);
const activeTab = { borderColor: "var(--amber)", color: "var(--amber)" };

export default function DashboardClient({ user }) {
  return (
    <ToastProvider>
      <DashboardInner user={user} />
    </ToastProvider>
  );
}

function DashboardInner({ user }) {
  const notify = useToast();
  const [files, setFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [activePanel, setActivePanel] = useState("editor");
  const [rightPanel, setRightPanel] = useState("ai");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [settings, setSettings] = useState(null);
  const [recentPaths, setRecentPaths] = useState([]);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [openPaths, setOpenPaths] = useState([]);
  const [celebrate, setCelebrate] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        if (d.settings?.defaultBranch) setBranch(d.settings.defaultBranch);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentPaths(JSON.parse(raw));
    } catch {
      // ignore - localStorage can be unavailable (private browsing, quota)
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.files?.length) setPendingRestore(draft);
      }
    } catch {
      // same as above
    }
  }, []);

  // Auto-save the workspace to localStorage (debounced) so a closed tab
  // or crashed browser doesn't lose unpushed work.
  useEffect(() => {
    if (!files.length) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ files, repo, branch, savedAt: Date.now() }));
      } catch {
        // quota exceeded / private browsing - auto-save is a convenience, never fatal
      }
    }, 800);
    return () => clearTimeout(t);
  }, [files, repo, branch]);

  // Auto sign-out after a long stretch with no interaction, since a
  // signed-in tab holds a decrypted path to pushing on the user's behalf.
  useEffect(() => {
    let timer = setTimeout(() => signOut({ callbackUrl: "/" }), INACTIVITY_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => signOut({ callbackUrl: "/" }), INACTIVITY_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  function noteRecent(path) {
    setRecentPaths((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, 10);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function selectFile(path) {
    setSelectedPath(path);
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    noteRecent(path);
    setActivePanel("editor");
  }

  function closeTab(path) {
    setOpenPaths((prev) => {
      const next = prev.filter((p) => p !== path);
      if (selectedPath === path) {
        setSelectedPath(next.at(-1) || null);
      }
      return next;
    });
  }

  async function checkMilestone() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data?.stats && MILESTONES.has(data.stats.totalPushes)) {
        setCelebrate(true);
        notify(`🎉 Milestone: ${data.stats.totalPushes} pushes!`, { type: "success", timeout: 5000 });
        setTimeout(() => setCelebrate(false), 2000);
      }
    } catch {
      // celebration is a nice-to-have, never worth surfacing an error for
    }
  }

  function handleFilesAdded(newFiles) {
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.path, f]));
      for (const f of newFiles) map.set(f.path, f);
      return Array.from(map.values());
    });
    if (!selectedPath && newFiles[0]) selectFile(newFiles[0].path);
  }

  function handleFilesReplace(newFiles) {
    setFiles(newFiles);
    setSelectedPath(newFiles[0]?.path || null);
    setOpenPaths(newFiles[0] ? [newFiles[0].path] : []);
  }

  function handleEditorChange(newContent) {
    setFiles((prev) => prev.map((f) => (f.path === selectedPath ? { ...f, content: newContent } : f)));
  }

  function handleRename(oldPath, newPath) {
    if (files.some((f) => f.path === newPath)) {
      notify("A file already exists at that path", { type: "error" });
      return;
    }
    setFiles((prev) => prev.map((f) => (f.path === oldPath ? { ...f, path: newPath } : f)));
    setOpenPaths((prev) => prev.map((p) => (p === oldPath ? newPath : p)));
    if (selectedPath === oldPath) setSelectedPath(newPath);
  }

  function handleDelete(path) {
    setFiles((prev) => prev.filter((f) => f.path !== path));
    setOpenPaths((prev) => prev.filter((p) => p !== path));
    if (selectedPath === path) setSelectedPath(null);
  }

  function handleDownloadFile(path) {
    const file = files.find((f) => f.path === path);
    if (!file) return;
    const blob =
      file.encoding === "base64"
        ? new Blob([Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0))])
        : new Blob([file.content ?? ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadProject() {
    if (!files.length) return;
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, name: repo ? repo.replace("/", "-") : "t3rri-hub-project" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(repo || "t3rri-hub-project").replace("/", "-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err.message, { type: "error" });
    }
  }

  function handleReplaceAll(find, replace) {
    if (!find) return;
    setFiles((prev) =>
      prev.map((f) => (f.encoding === "base64" ? f : { ...f, content: (f.content || "").split(find).join(replace) }))
    );
    notify(`Replaced "${find}" across loaded files`, { type: "success" });
  }

  function selectPanel(p) {
    setActivePanel(p);
    if (p === "ai" || p === "tools") setRightPanel(p);
  }

  const selectedFile = files.find((f) => f.path === selectedPath);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <CommandPalette files={files} onSelect={selectFile} onReplaceAll={handleReplaceAll} />
      {celebrate && <Confetti />}

      {pendingRestore && (
        <div
          style={{
            padding: "8px 16px",
            background: "var(--amber-soft)",
            display: "flex",
            justifyContent: "center",
            gap: 12,
            alignItems: "center",
            fontSize: 13,
            flexWrap: "wrap",
            textAlign: "center",
          }}
        >
          <span>
            Restore your last session ({pendingRestore.files.length} file(s), saved {new Date(pendingRestore.savedAt).toLocaleString()})?
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => {
              setFiles(pendingRestore.files);
              if (pendingRestore.repo) setRepo(pendingRestore.repo);
              if (pendingRestore.branch) setBranch(pendingRestore.branch);
              setPendingRestore(null);
            }}
          >
            Restore
          </button>
          <button
            className="btn"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => {
              try {
                localStorage.removeItem(DRAFT_KEY);
              } catch {
                // ignore
              }
              setPendingRestore(null);
            }}
          >
            Discard
          </button>
        </div>
      )}

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/icons/icon.svg" alt="" width={26} height={26} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>T3RRI HUB</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user.isAdmin && (
            <Link href="/admin" className="btn" style={{ padding: "5px 10px", fontSize: 12 }}>
              Admin
            </Link>
          )}
          <InstallAndNotify />
          {user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />
          )}
          <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </div>
      </header>

      <div
        className="gd-tabs"
        style={{ display: "none", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}
      >
        {["files", "editor", "ai", "tools"].map((p) => (
          <button
            key={p}
            onClick={() => selectPanel(p)}
            className="btn"
            style={{ padding: "6px 12px", fontSize: 12, ...(activePanel === p ? activeTab : {}) }}
          >
            {p === "ai" ? "T3RRI AI" : p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="gd-layout" style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", flex: 1, minHeight: 0 }}>
        <div className={`gd-panel ${activePanel === "files" ? "active" : ""}`} style={{ borderRight: "1px solid var(--line)", minHeight: 0 }}>
          <FileExplorer
            files={files}
            selectedPath={selectedPath}
            onSelect={selectFile}
            onFilesAdded={handleFilesAdded}
            onRename={handleRename}
            onDelete={handleDelete}
            onDownloadFile={handleDownloadFile}
            showHidden={settings?.showHiddenFiles}
            recentPaths={recentPaths}
          />
        </div>

        <div className={`gd-panel ${activePanel === "editor" ? "active" : ""}`} style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          {openPaths.length > 0 && (
            <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
              {openPaths.map((p) => (
                <div
                  key={p}
                  onClick={() => selectFile(p)}
                  className="mono-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 10px",
                    fontSize: 12,
                    textTransform: "none",
                    letterSpacing: 0,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    borderRight: "1px solid var(--line)",
                    background: p === selectedPath ? "var(--amber-soft)" : "transparent",
                    color: p === selectedPath ? "var(--amber)" : "var(--paper-dim)",
                  }}
                >
                  {p.split("/").pop()}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(p);
                    }}
                    style={{ opacity: 0.6 }}
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor
              path={selectedPath}
              file={selectedFile}
              onChange={handleEditorChange}
              settings={settings}
              editorRef={editorRef}
              onDownloadFile={handleDownloadFile}
            />
          </div>
        </div>

        <div
          className={`gd-panel ${activePanel === "ai" || activePanel === "tools" ? "active" : ""}`}
          style={{ borderLeft: "1px solid var(--line)", minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", gap: 4, padding: 8, borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
            <button
              className="btn"
              style={{ padding: "5px 10px", fontSize: 12, ...(rightPanel === "ai" ? activeTab : {}) }}
              onClick={() => selectPanel("ai")}
            >
              T3RRI AI
            </button>
            <button
              className="btn"
              style={{ padding: "5px 10px", fontSize: 12, ...(rightPanel === "tools" ? activeTab : {}) }}
              onClick={() => selectPanel("tools")}
            >
              Tools
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {rightPanel === "ai" ? (
              <AiChatPanel
                fileContext={selectedFile?.encoding === "base64" ? null : selectedFile?.content}
                filePaths={files.map((f) => f.path)}
              />
            ) : (
              <ToolsPanel repo={repo} branch={branch} files={files} onFilesReplace={handleFilesReplace} />
            )}
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <CommitBar
          files={files}
          disabled={!user.hasGithubToken}
          repo={repo}
          branch={branch}
          onRepoChange={setRepo}
          onBranchChange={setBranch}
          onFilesReplace={handleFilesReplace}
          defaultCommitMessage={settings?.commitMessageTemplate}
          onPushed={() => {
            notify(`Pushed to ${repo}`, { type: "success" });
            checkMilestone();
          }}
        />
        {files.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 12px" }}>
            <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleDownloadProject}>
              ⬇ Download project as .zip
            </button>
          </div>
        )}
      </div>

      <style>{`
        .gd-panel { overflow: auto; }
        @media (max-width: 900px) {
          .gd-layout { grid-template-columns: 1fr !important; }
          .gd-panel { display: none; }
          .gd-panel.active { display: flex; flex-direction: column; }
          .gd-tabs { display: flex !important; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
