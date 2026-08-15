import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const run = promisify(execFile);

/**
 * Commits a set of in-memory files and pushes them to a GitHub repo.
 *
 * This is the same idea as the shell script most people write for this
 * (git init, add, commit, push with a token in the remote URL) with two
 * changes that matter once more than one person can hit this at the
 * same time:
 *
 *  1. Every push runs in its own fresh temp directory instead of one
 *     shared folder, so two users pushing at once can't corrupt each
 *     other's commit.
 *  2. Arguments are passed to git as an array via execFile, never
 *     interpolated into a shell string, so a filename or commit message
 *     containing quotes/backticks can't break out and run something
 *     else.
 *
 * @param {object} opts
 * @param {{path: string, content: string}[]} opts.files
 * @param {string} opts.repoFullName - "owner/repo"
 * @param {string} opts.branch
 * @param {string} opts.commitMessage - editable by the user in the UI
 * @param {string} opts.githubToken - decrypted GitHub OAuth token
 * @param {string} opts.gitUserName
 * @param {string} opts.gitUserEmail
 * @param {boolean} [opts.force] - only set when the user explicitly
 *   confirms overwriting remote history after a rejected push
 */
export async function pushFilesToGithub({
  files,
  repoFullName,
  branch = "main",
  commitMessage,
  githubToken,
  gitUserName,
  gitUserEmail,
  force = false,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repoFullName)) {
    throw new Error('repoFullName must look like "owner/repo"');
  }
  if (!files?.length) {
    throw new Error("No files to push");
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "t3rri-hub-"));

  try {
    await run("git", ["init", "-b", branch], { cwd: workDir });
    await run("git", ["config", "user.name", gitUserName || "T3RRI HUB"], { cwd: workDir });
    await run("git", ["config", "user.email", gitUserEmail || "noreply@t3rri-hub.app"], {
      cwd: workDir,
    });

    for (const file of files) {
      const relativePath = file.path.replace(/^\/+/, "");
      const target = path.join(workDir, relativePath);
      // Guard against a file path escaping the temp workspace
      // (e.g. "../../etc/passwd" from a maliciously named zip entry).
      if (!target.startsWith(workDir + path.sep)) {
        throw new Error(`Unsafe file path: ${file.path}`);
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      // Images/binaries travel as base64 so they survive intact instead
      // of being mangled by a forced utf8 decode - write real bytes.
      const bytes =
        file.encoding === "base64" ? Buffer.from(file.content || "", "base64") : file.content ?? "";
      await fs.writeFile(target, bytes);
    }

    await run("git", ["add", "."], { cwd: workDir });
    await run("git", ["commit", "-m", commitMessage?.trim() || "Update via T3RRI HUB"], {
      cwd: workDir,
    });
    const { stdout: sha } = await run("git", ["rev-parse", "HEAD"], { cwd: workDir });

    const remoteUrl = `https://x-access-token:${githubToken}@github.com/${repoFullName}.git`;
    await run("git", ["remote", "add", "origin", remoteUrl], { cwd: workDir });

    const pushArgs = ["push", "-u", "origin", branch];
    if (force) pushArgs.push("--force");
    await run("git", pushArgs, { cwd: workDir });

    const commitSha = sha.trim();
    return { success: true, sha: commitSha, commitUrl: `https://github.com/${repoFullName}/commit/${commitSha}` };
  } catch (err) {
    // Classify the failure so the UI/email can give a more useful
    // pointer than the raw git stderr.
    const message = err.stderr || err.message || String(err);
    let errorType = "other";
    if (/rejected|non-fast-forward|fetch first/i.test(message)) errorType = "remote_ahead";
    else if (/authentication failed|403|bad credentials|401/i.test(message)) errorType = "auth";
    else if (/repository not found|404/i.test(message)) errorType = "not_found";

    const error = new Error(errorType === "remote_ahead" ? "REMOTE_AHEAD" : message);
    error.rejected = errorType === "remote_ahead";
    error.errorType = errorType;
    error.detail = message;
    throw error;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
