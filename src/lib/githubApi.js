// Thin wrapper around the GitHub REST API for everything that isn't a
// commit+push (that's handled by gitOps.js via the git CLI instead -
// shelling out to real git for a real commit is simpler and more
// battle-tested than reimplementing it over the API). Everything here
// is read-mostly: the signed-in user's repos, branches, commits, and
// file trees.

const API = "https://api.github.com";

async function gh(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const error = new Error(`GitHub API ${path} failed (${res.status}): ${detail.slice(0, 300)}`);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Repos the signed-in user owns or collaborates on, most recently pushed first. */
export async function listMyRepos(token, { perPage = 40 } = {}) {
  const repos = await gh(token, `/user/repos?sort=pushed&per_page=${perPage}`);
  return repos.map((r) => ({
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch,
    updatedAt: r.pushed_at,
  }));
}

export async function listBranches(token, repoFullName) {
  const branches = await gh(token, `/repos/${repoFullName}/branches?per_page=100`);
  return branches.map((b) => ({ name: b.name, protected: b.protected }));
}

export async function createBranch(token, repoFullName, { newBranch, fromBranch }) {
  const base = await gh(token, `/repos/${repoFullName}/git/ref/heads/${encodeURIComponent(fromBranch)}`);
  await gh(token, `/repos/${repoFullName}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: base.object.sha }),
  });
  return { name: newBranch };
}

export async function listCommits(token, repoFullName, { branch, perPage = 20 } = {}) {
  const qs = new URLSearchParams({ per_page: String(perPage) });
  if (branch) qs.set("sha", branch);
  const commits = await gh(token, `/repos/${repoFullName}/commits?${qs}`);
  return commits.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message,
    authorName: c.commit.author?.name,
    date: c.commit.author?.date,
    url: c.html_url,
  }));
}

/**
 * Full file tree + content at a given ref (branch name or commit sha),
 * for "fetch latest" and "restore this commit". Binary files come back
 * base64-encoded (see src/lib/fileTypes.js), same shape the rest of
 * the app already uses for uploads.
 */
export async function fetchRepoFiles(token, repoFullName, ref, { maxFiles = 500 } = {}) {
  const treeInfo = await gh(
    token,
    `/repos/${repoFullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`
  );
  if (treeInfo.truncated) {
    console.warn(`Tree for ${repoFullName}@${ref} was truncated by GitHub's API - returning a partial set`);
  }

  const blobs = treeInfo.tree.filter((t) => t.type === "blob").slice(0, maxFiles);

  const files = await Promise.all(
    blobs.map(async (entry) => {
      try {
        const blob = await gh(token, `/repos/${repoFullName}/git/blobs/${entry.sha}`);
        if (blob.encoding !== "base64") return null;
        const buf = Buffer.from(blob.content, "base64");
        // Anything that looks binary (contains a null byte) stays
        // base64 for the editor's image preview; the rest becomes text.
        const looksBinary = buf.includes(0);
        return {
          path: entry.path,
          content: looksBinary ? buf.toString("base64") : buf.toString("utf8"),
          encoding: looksBinary ? "base64" : "utf8",
        };
      } catch {
        return null;
      }
    })
  );

  return files.filter(Boolean);
}
