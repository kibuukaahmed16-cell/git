// Shared file-type helpers: which extensions are binary (kept as
// base64 in memory, previewed rather than edited) vs text (opened
// directly in Monaco), plus a small icon-by-extension map for the
// file tree.

const RASTER_IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif"]);
// SVG is visually an image but is actually a text/XML format - it stays
// editable as text (and safely previewable without base64) rather than
// being treated as binary. isSvgPath() is exported so callers that need
// to tell the two image kinds apart (CodeEditor, ShareViewer) can.
const VECTOR_IMAGE_EXTS = new Set(["svg"]);

export function extOf(filePath) {
  return filePath.split(".").pop()?.toLowerCase() || "";
}

export function isImagePath(filePath) {
  const ext = extOf(filePath);
  return RASTER_IMAGE_EXTS.has(ext) || VECTOR_IMAGE_EXTS.has(ext);
}

export function isSvgPath(filePath) {
  return VECTOR_IMAGE_EXTS.has(extOf(filePath));
}

// Anything not on this list falls back to "binary" - editing corrupted
// "text" is worse than declining to open a file inline.
const KNOWN_TEXT_EXTS = new Set([
  "js", "jsx", "mjs", "cjs", "ts", "tsx", "json", "jsonc", "css", "scss", "sass", "less",
  "html", "htm", "md", "mdx", "txt", "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp",
  "cc", "hpp", "cs", "php", "sh", "bash", "zsh", "yml", "yaml", "sql", "xml", "toml", "ini",
  "env", "graphql", "vue", "svelte", "lock", "csv", "log", "prisma", "gitignore", "editorconfig",
  "svg",
]);

export function isBinaryPath(filePath) {
  const ext = extOf(filePath);
  if (RASTER_IMAGE_EXTS.has(ext)) return true;
  if (KNOWN_TEXT_EXTS.has(ext)) return false;
  // No extension (e.g. "Dockerfile", "LICENSE", "Makefile") - these
  // are almost always text in real projects.
  if (!filePath.includes(".")) return false;
  return true;
}

const ICONS = {
  js: "📜", jsx: "📜", mjs: "📜", cjs: "📜", ts: "📘", tsx: "📘",
  json: "🧾", jsonc: "🧾", css: "🎨", scss: "🎨", sass: "🎨", less: "🎨",
  html: "🌐", htm: "🌐", md: "📝", mdx: "📝", txt: "📄",
  py: "🐍", rb: "💎", go: "🐹", rs: "🦀", java: "☕", kt: "🟣",
  c: "🔧", h: "🔧", cpp: "🔧", cc: "🔧", hpp: "🔧", cs: "🔷", php: "🐘",
  sh: "💻", bash: "💻", zsh: "💻", yml: "⚙️", yaml: "⚙️", sql: "🗄️",
  xml: "📰", toml: "⚙️", ini: "⚙️", lock: "🔒", csv: "📊", log: "🧻",
  png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", webp: "🖼️", bmp: "🖼️",
  ico: "🖼️", avif: "🖼️", svg: "🖼️",
};

export function iconFor(filePath) {
  return ICONS[extOf(filePath)] || "📄";
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Byte length of a file entry's content, accounting for base64 vs utf8 encoding. */
export function byteSize(file) {
  if (!file?.content) return 0;
  if (file.encoding === "base64") {
    return Math.floor((file.content.length * 3) / 4);
  }
  return new TextEncoder().encode(file.content).length;
}
