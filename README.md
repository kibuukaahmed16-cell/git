# T3RRI HUB

Upload files (or a whole zip, or a whole folder), edit them in a browser-based
editor, and push straight to GitHub with a commit message you write yourself.
Works on a phone, a tablet, or a computer, and installs as a PWA with push
notifications. Formerly named Git Deck.

Built by Terri ([@what-sapp](https://github.com/what-sapp)).

## Stack

Next.js 16 (App Router, one service for frontend + API) · a GitHub Gist as
the datastore (see below) · Auth.js v5 (GitHub + Google) · Monaco Editor ·
web-push · Nodemailer

## Why a Gist instead of a database

The original plan used Postgres, but free-tier hosted databases expire.
T3RRI HUB now stores everything - users, linked accounts, projects, push
history, settings, stashes, share links, feedback, feature flags - as one
JSON document in a private GitHub Gist, read and written through GitHub's
API (`src/lib/gistDb.js`). It doesn't expire, it inherits GitHub's uptime,
and every write is automatically versioned in the Gist's own revision
history for free.

Trade-offs worth knowing before you rely on this at any real scale:

- Every read/write is a full-document GET/PATCH - fine for a personal or
  small-team tool, not built for heavy concurrent write traffic.
- Writes are only serialized *within one server process*. Running multiple
  instances behind a load balancer means two of them could race and one
  write could clobber another.
- **Treat `GIST_DB_ID` as a secret.** A "secret" Gist is unlisted, not
  access-controlled - anyone with the ID can read it. Stored GitHub tokens
  are encrypted at rest (`src/lib/crypto.js`) so that specific field is
  safe either way, but names/emails/push history are plain JSON.

If T3RRI HUB ever needs real concurrent write throughput, swap
`src/lib/gistDb.js` for an actual database - the rest of the app only
talks to the query layer in `src/lib/db.js`, so that's a one-file change.

## What's implemented

**Core loop** - upload (files, a folder, or a zip with path-traversal/zip-bomb
guards) → edit in Monaco → push to any repo you can access, with a real
repo picker, branch create/switch, "fetch latest," commit history with
one-click restore, and stashes for work you're not ready to push yet.

**Editor** - image/Markdown/CSV/JSON/SVG preview, multi-file tabs, recent
files, quick open (`Ctrl/Cmd+P`), cross-file search + replace-all
(`Ctrl/Cmd+Shift+F`), a shortcuts popup (`?`), undo/redo, format-document,
per-file download, rename/delete from the tree, dark/light theme, font
size, tab size, word wrap, minimap and line-number toggles, hidden-file
filter.

**T3RRI AI** - a chat panel plus one-click actions (explain, refactor,
generate tests, generate docs, review, find bugs, suggest a commit message,
suggest a filename, suggest a project structure) built on one
`askDeckAI()` function in `src/lib/aiProvider.js`, so swapping the backend
is a one-file change. Currently wired to a small unauthenticated API with
no SLA - see the caveat below.

**Notifications** - web push, in-app toasts, optional Slack/Discord
webhooks, and a full email system (see below).

**Email** - all sent through `src/lib/email.js`, each behind its own
per-user setting (Tools → Settings → Notifications):

| Email | Trigger | Needs a cron job? |
|---|---|---|
| Welcome | First sign-in | No |
| Push result (+ commit link, tailored fix tip on failure) | Every push | No |
| New sign-in alert | Every sign-in after the first | No |
| Push milestone (1, 10, 25, 50, 100, 250, 500, 1000) | Right after the qualifying push | No |
| Feedback resolved | Admin marks it resolved | No |
| Announcement / beta invite | Admin sends from `/admin` | No - manual |
| Weekly digest | - | **Yes** - `scripts/activity_report.mjs --period=weekly` |
| Monthly report | - | **Yes** - `scripts/activity_report.mjs --period=monthly` |
| Re-engagement (30+ days idle) | - | **Yes** - `scripts/maintenance_emails.mjs` |
| Stash reminder (14+ days old) | - | **Yes** - `scripts/maintenance_emails.mjs` |
| GitHub token issue | - | **Yes** - `scripts/maintenance_emails.mjs` (reactive: catches a token that's already stopped working, since GitHub doesn't hand out an expiry date to predict from) |

The "needs a cron job" ones don't run on their own - a stock Next.js
server has no background worker. Point Railway Cron or a VPS crontab at
them:

```bash
# weekly digest, Monday 9am-ish
0 14 * * MON  cd /path/to/t3rri-hub && node scripts/activity_report.mjs --period=weekly

# monthly report, 1st of the month
0 14 1 * *    cd /path/to/t3rri-hub && node scripts/activity_report.mjs --period=monthly

# re-engagement + token check + stash reminders, weekly is plenty
0 15 * * MON  cd /path/to/t3rri-hub && node scripts/maintenance_emails.mjs
```

Not covered, and why: **collaboration notifications** (no
team/repo-sharing model exists to know who else has access to a repo),
**code review request emails** (no code review feature exists),
**password change confirmations** (there are no passwords - GitHub/Google
OAuth only).

**Security & privacy** - rate limiting on every mutating route, an
advisory (not authoritative) content scan for things like accidentally
committed private keys, session timeout with auto-logout, a GDPR data
export and account-delete flow, and a lightweight sign-in audit log.

**Gamification** - push streaks, badges, a 90-day contribution graph, and
a leaderboard, all derived from push history.

**Admin** (`/admin`, gated by `ADMIN_GITHUB_USERNAMES`/`ADMIN_EMAILS`) -
usage overview, feature flags, a site-wide announcement banner, an
"email everyone" broadcast tool, and a feedback inbox.

**Sharing** - read-only links (`/share/[token]`) to a snapshot of your
current files, no account needed to view.

**PWA + SEO basics** - manifest, service worker, push notifications,
Open Graph/Twitter card image, sitemap, AdSense script + `ads.txt`, Search
Console verification - all wired to env vars.

**Tests** - `npm test` runs dependency-free `node:test` unit tests for the
token encryption round-trip, file-type/binary detection, the content
scanner, and the rate limiter (`tests/`).

## What's genuinely not here

Being upfront about scope, since "add everything" doesn't fit in one pass:

- **Real-time collaboration** (live comments, @mentions, an activity feed,
  pair programming, a merge-conflict UI, team workspaces with roles) - each
  of these is its own multi-user, real-time subsystem and deserves a
  dedicated build rather than a bolt-on.
- **Sentry / performance / user-behavior analytics / SMS alerts** - all
  need a third-party account and API key I don't have. Route-level usage
  counts and push success rate are tracked and shown in `/admin` as a
  lighter-weight stand-in.
- **Full E2E/accessibility/performance test suites** - `npm test` covers
  pure logic; there's no Playwright/axe setup.
- Two-factor auth wasn't added - sign-in is GitHub/Google OAuth only (no
  password), so a bolted-on TOTP step wouldn't add real protection beyond
  what your GitHub/Google account's own 2FA already gives you.

## 1. Install

```bash
npm install
```

## 2. Create the Gist database

```bash
GIST_DB_TOKEN=ghp_xxx node scripts/init_gist_db.mjs
```

The token needs the **gist** scope (classic token - fine-grained tokens
can't currently manage gists). Create one at
github.com/settings/tokens. The script prints `GIST_DB_ID` and
`GIST_DB_TOKEN` - copy both into your `.env`.

## 3. Set your environment variables

Copy `.env.example` to `.env` and fill it in - every variable has a
comment explaining where it comes from. The short version:

| Variable | Where to get it |
|---|---|
| `GIST_DB_TOKEN` / `GIST_DB_ID` | Step 2 above. |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | github.com/settings/developers → New OAuth App. Callback: `<SITE_URL>/api/auth/callback/github`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | console.cloud.google.com/apis/credentials. Callback: `<SITE_URL>/api/auth/callback/google`. Needs a Consent Screen with your privacy policy URL before real users (not just you) can sign in. |
| `ENCRYPTION_KEY` | `openssl rand -hex 32`. Encrypts the stored GitHub token - don't lose it, don't reuse it elsewhere. |
| `ADMIN_GITHUB_USERNAMES` / `ADMIN_EMAILS` | Comma-separated allowlist for `/admin`. Leave both empty and nobody gets admin access. |
| `EMAIL_FROM` / `EMAIL_APP_PASSWORD` | A Gmail address + an App Password (Google Account → Security → 2-Step Verification → App passwords - **not** your normal password). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys`. Also copy the public key into `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. |
| `AI_API_BASE_URL` | Defaults to the API you gave me. See the T3RRI AI caveat above. |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Your AdSense account, once approved. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console → Add property → HTML tag method → just the `content="..."` value. |

## 4. Run it locally

```bash
npm run dev
```

## 5. Run the tests

```bash
npm test
```

## 6. Deploy

### Railway

Railway auto-detects the `Dockerfile` in this repo.

1. Push this repo to GitHub (you can do this with plain `git`, or with
   T3RRI HUB itself once it's live).
2. Railway → New Project → Deploy from GitHub repo.
3. Add every variable from `.env` in Railway's Variables tab.
4. Deploy. `railway.json` points Railway's health check at `/api/health`.
5. Update `NEXT_PUBLIC_SITE_URL`, `public/robots.txt`'s sitemap URL, and
   both OAuth apps' callback URLs to your real Railway URL.

### A VPS

```bash
git clone <your-repo-url>
cd t3rri-hub
docker build -t t3rri-hub .
docker run -d --name t3rri-hub \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  t3rri-hub
```

Put a reverse proxy (Caddy or Nginx) in front for TLS. A minimal
Caddyfile:

```
your-domain.com {
  reverse_proxy localhost:3000
}
```

Caddy handles the HTTPS certificate automatically. Then update
`NEXT_PUBLIC_SITE_URL` and the OAuth callback URLs to match your domain,
same as the Railway steps above.

### Without Docker

Works too, as long as `git` is installed on the host (T3RRI HUB shells
out to the real `git` CLI to build each commit):

```bash
npm install
npm run build
npm start
```

## Regenerating the logo/icons

The full PWA icon set (`public/icons/`) and the Open Graph image
(`public/og-image.jpg`) are generated from `assets/brand/source-logo.jpg`.
Regenerate anytime after swapping that source file:

```bash
pip install pillow
python3 scripts/make_icons.py
```

## Project structure

```
src/lib/gistDb.js       low-level Gist read/write (the "database engine")
src/lib/db.js           query layer everything else actually imports
src/lib/gistAdapter.js  Auth.js Adapter implementation over db.js
src/lib/gitOps.js       shells out to git to build/push a commit
src/lib/githubApi.js    GitHub REST calls: repos, branches, commits, trees
src/lib/aiProvider.js   the one function T3RRI AI talks through
src/app/api/            one route per feature - see the file list, it's flat
src/app/admin/          admin UI (gated - see ADMIN_GITHUB_USERNAMES)
src/app/share/[token]/  public read-only share-link viewer
tests/                  node:test unit tests, zero extra dependencies
```
