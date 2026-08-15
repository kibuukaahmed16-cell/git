// One-time setup: creates the secret Gist that T3RRI HUB uses as its
// database, and prints the GIST_DB_ID to put in your environment.
//
// Usage:
//   GIST_DB_TOKEN=ghp_xxx node scripts/init_gist_db.mjs
//
// The token needs the "gist" scope. Create one (classic token, not
// fine-grained - fine-grained tokens currently can't manage gists) at:
//   https://github.com/settings/tokens
//
// Treat the resulting GIST_DB_ID as a secret once it's set: a "secret"
// Gist is unlisted, not access-controlled - anyone with the ID can
// read it. GitHub tokens stored inside are encrypted (see
// src/lib/crypto.js), but other fields (names, emails, push history)
// are plain JSON.

const token = process.env.GIST_DB_TOKEN;
if (!token) {
  console.error("Set GIST_DB_TOKEN first, e.g.:\n  GIST_DB_TOKEN=ghp_xxx node scripts/init_gist_db.mjs");
  process.exit(1);
}

const emptyDb = {
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

const res = await fetch("https://api.github.com/gists", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
  body: JSON.stringify({
    description: "T3RRI HUB data store - do not edit by hand, do not make public",
    public: false,
    files: {
      "t3rri-hub-db.json": { content: JSON.stringify(emptyDb, null, 2) },
    },
  }),
});

if (!res.ok) {
  console.error(`Failed to create gist (${res.status}):`, await res.text());
  process.exit(1);
}

const gist = await res.json();
console.log("Gist DB created.\n");
console.log("Add these to your environment:");
console.log(`  GIST_DB_ID=${gist.id}`);
console.log(`  GIST_DB_TOKEN=${token}`);
console.log(`\nView it (private, don't share the link) at: ${gist.html_url}`);
