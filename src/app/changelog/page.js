import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Changelog — T3RRI HUB" };

const ENTRIES = [
  {
    date: "2026-08-13",
    title: "Fixed a Docker build failure, full email system",
    items: [
      "Fixed a real bug: the dashboard's sign-out button was pulling nodemailer (and its Node-only net/tls dependencies) into the browser bundle, breaking Docker/production builds - it now uses the client-safe sign-out path",
      "Push emails now include a link to the exact commit, and failure emails include a tailored fix tip based on what went wrong",
      "New sign-in security alerts, push-milestone emails, and a feedback-resolved notification - all sent immediately, no scheduler needed",
      "Admin can now broadcast an email (announcements, beta invites) to every user from /admin",
      "Two new opt-in scheduled emails for whoever runs this instance to wire up via cron: a weekly digest / monthly report (scripts/activity_report.mjs) and re-engagement + stash reminders + a reactive GitHub-token check (scripts/maintenance_emails.mjs)",
      "New Settings toggles for each of the above",
    ],
  },
  {
    date: "2026-08-10",
    title: "Rebrand to T3RRI HUB, Gist-backed storage, and a big feature drop",
    items: [
      "Renamed from Git Deck to T3RRI HUB, with a new mark and app icons",
      "Replaced the Postgres/Prisma database with a Gist-backed store, so there's nothing that expires on a free-tier trial",
      "Real GitHub repo picker, branch create/switch, fetch-latest, commit history with restore, and stashes",
      "T3RRI AI quick actions: explain, refactor, generate tests, generate docs, review, find bugs, suggest a commit message, suggest a filename",
      "Image, Markdown, CSV, and JSON preview in the editor",
      "Command palette: quick open (Ctrl/Cmd+P), cross-file search + replace (Ctrl/Cmd+Shift+F), shortcuts help (?)",
      "Settings panel: theme, font size, tab size, word wrap, minimap, hidden files, commit message template, email/webhook notification preferences",
      "Read-only share links, project/file download, in-app toasts, rate limiting, an advisory content scan, session timeout, GDPR export/delete",
      "Push streaks, badges, and a contribution graph",
      "A small admin view (feature flags, announcement banner, feedback inbox, usage overview) for whoever runs this instance",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 32, color: "var(--paper)" }}>Changelog</h1>
        <div style={{ marginTop: 32, display: "grid", gap: 32 }}>
          {ENTRIES.map((e) => (
            <section key={e.date}>
              <p style={{ fontFamily: "var(--font-mono)", color: "var(--amber)", fontSize: 13 }}>{e.date}</p>
              <h3 style={{ marginTop: 6, color: "var(--paper)", fontSize: 19 }}>{e.title}</h3>
              <ul style={{ marginTop: 10, paddingLeft: 20, color: "var(--paper-dim)", lineHeight: 1.8 }}>
                {e.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
