// A GitHub Gist used as T3RRI HUB's entire "database" - users,
// accounts, projects, push history, settings, everything lives as one
// JSON blob in a single secret Gist file.
//
// Why: a hosted Postgres free tier expires after a while (that's what
// sent this app here in the first place). A Gist doesn't expire,
// inherits GitHub's uptime, and every write is automatically
// versioned in the Gist's own revision history - a free backup log.
//
// This is deliberately NOT a real database:
//  - Every read/write is a full-document GET/PATCH against GitHub's
//    API. Fine at hobby-project scale; it will not hold up under
//    heavy concurrent write traffic.
//  - There's no cross-instance transaction isolation. Two requests on
//    two different server instances racing to write at the same
//    moment can clobber each other (last write wins). mutateDb()
//    below only serializes writes *within one process* - see its
//    docstring.
//  - GIST_DB_ID should be treated as a secret. A "secret" Gist is
//    unlisted, not access-controlled - anyone with the ID can read
//    it. GitHub tokens stored in it are encrypted at rest (see
//    src/lib/crypto.js) so that specific field is safe either way,
//    but names/emails/push history are plain JSON. Don't commit
//    GIST_DB_ID, don't expose it client-side, don't make the gist
//    public.
//
// If T3RRI HUB ever needs to handle real concurrent write volume,
// swap this file out for an actual database again - everything else
// talks to the query layer in src/lib/db.js, not to this file
// directly, so that's a one-file change.

const GITHUB_API = "https://api.github.com";
const FILENAME = "t3rri-hub-db.json";
const CACHE_MS = 5000;

function requireEnv() {
  const token = process.env.GIST_DB_TOKEN;
  const gistId = process.env.GIST_DB_ID;
  if (!token || !gistId) {
    throw new Error(
      "GIST_DB_TOKEN and GIST_DB_ID must be set. Run `node scripts/init_gist_db.mjs` once to create the store, then copy its output into your env."
    );
  }
  return { token, gistId };
}

export function emptyDb() {
  return {
    version: 1,
    users: [],
    accounts: [],
    sessions: [],
    verificationTokens: [],
    projects: [],
    pushSubscriptions: [],
    pushes: [],
    stashes: [],
    shareLinks: [],
    feedback: [],
    securityEvents: [],
    routeUsage: {},
    featureFlags: {},
    announcement: null,
  };
}

// Per-process cache so a burst of reads in one server instance doesn't
// each round-trip to GitHub. Any write updates the cache directly.
let cache = null;
let cacheAt = 0;

// Serializes writes within this process so concurrent requests here
// don't interleave a read-modify-write. Does not help across multiple
// server instances/regions - see the file header.
let writeQueue = Promise.resolve();

async function githubRequest(method, gistId, token, body) {
  const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gist DB request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return res.json();
}

async function readRaw() {
  const { token, gistId } = requireEnv();
  const gist = await githubRequest("GET", gistId, token);
  const file = gist.files?.[FILENAME];
  if (!file) return emptyDb();

  // The Gist API truncates file content over ~1MB and sets
  // `truncated: true` with a raw_url to fetch the untruncated file.
  if (file.truncated) {
    const res = await fetch(file.raw_url);
    return JSON.parse(await res.text());
  }
  if (!file.content?.trim()) return emptyDb();
  try {
    return JSON.parse(file.content);
  } catch {
    return emptyDb();
  }
}

export async function readDb({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const data = await readRaw();
  cache = data;
  cacheAt = Date.now();
  return data;
}

async function writeRaw(data) {
  const { token, gistId } = requireEnv();
  await githubRequest("PATCH", gistId, token, {
    files: { [FILENAME]: { content: JSON.stringify(data, null, 2) } },
  });
  cache = data;
  cacheAt = Date.now();
}

/**
 * Runs `mutator(db)` against a freshly-read DB (bypassing the cache)
 * and persists whatever it returns. Calls are queued so concurrent
 * mutations in this process apply one at a time instead of racing.
 *
 * `mutator` can be sync or async, and can mutate `db` in place and
 * return nothing (it's saved either way) or return a replacement.
 */
export function mutateDb(mutator) {
  const run = async () => {
    const db = await readDb({ fresh: true });
    const next = (await mutator(db)) || db;
    await writeRaw(next);
    return next;
  };
  const result = writeQueue.then(run, run);
  // Keep the queue alive even if this mutation throws, so later
  // callers aren't stuck behind a permanently-rejected promise.
  writeQueue = result.then(
    () => {},
    () => {}
  );
  return result;
}
