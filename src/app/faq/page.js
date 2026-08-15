import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "FAQ — T3RRI HUB" };

const FAQS = [
  {
    q: "Do I need to know Git to use this?",
    a: "No. Uploading, editing, and pushing all happen through the UI - T3RRI HUB runs git commands on the server on your behalf.",
  },
  {
    q: "Why does it ask for GitHub access with the repo scope?",
    a: "Pushing commits to your repositories requires it. The token is encrypted at rest and only ever used server-side to talk to GitHub's API.",
  },
  {
    q: "Where is my data actually stored?",
    a: "In a private GitHub Gist that this instance's operator controls, instead of a traditional database. See the Privacy page for what that means.",
  },
  {
    q: "What happens if two people push at the same time?",
    a: "GitHub rejects the second push if the branch moved since you last fetched it. T3RRI HUB shows that as a conflict with an option to force-push if you're sure you want to overwrite it.",
  },
  {
    q: "Can I use this on my phone?",
    a: "Yes - it's a installable PWA. Add it to your home screen from the browser share/install menu for an app-like experience, including push notifications on push results.",
  },
  {
    q: "Is T3RRI AI always right?",
    a: "No. Treat it like a fast second opinion, not a source of truth - review anything it suggests before relying on it, especially generated code.",
  },
  {
    q: "Can I self-host this?",
    a: "Yes - it runs on Railway or any VPS with Node.js. See the README for setup.",
  },
];

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 32, color: "var(--paper)" }}>Frequently asked questions</h1>
        <div style={{ marginTop: 32, display: "grid", gap: 24 }}>
          {FAQS.map((f) => (
            <section key={f.q}>
              <h3 style={{ color: "var(--paper)", fontSize: 17 }}>{f.q}</h3>
              <p style={{ marginTop: 8, color: "var(--paper-dim)", lineHeight: 1.7 }}>{f.a}</p>
            </section>
          ))}
        </div>
        <p style={{ marginTop: 40, color: "var(--paper-dim)", fontSize: 14 }}>
          Something else on your mind? Use the Feedback tab in the dashboard, or see the Contact line on the{" "}
          <a href="/terms" style={{ color: "var(--amber)" }}>
            Terms
          </a>{" "}
          page.
        </p>
      </main>
      <Footer />
    </>
  );
}
