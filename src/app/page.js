import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroDiffPanel from "@/components/HeroDiffPanel";
import { SignInButton } from "@/components/AuthButtons";

const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Drop in a single file, a whole folder, or a zip. Folders and zips are unpacked automatically, structure intact.",
  },
  {
    n: "02",
    title: "Edit",
    body: "A real code editor in the browser, with T3RRI AI sitting next to it if you want a second opinion on what you just wrote.",
  },
  {
    n: "03",
    title: "Push",
    body: "Write your own commit message and push to any repo you own. No terminal, no local git config.",
  },
];

const FEATURES = [
  {
    title: "Zip & folder uploads",
    body: "Upload a whole project at once. T3RRI HUB extracts it and rebuilds the folder structure in the editor.",
  },
  {
    title: "T3RRI AI",
    body: "Ask questions about the file you're editing without leaving the tab.",
  },
  {
    title: "Install it like an app",
    body: "Add T3RRI HUB to your home screen on iPhone, Android, or your computer, and get a notification when a push finishes.",
  },
  {
    title: "Sign in with GitHub or Google",
    body: "GitHub sign-in is what actually pushes your commits. Google is there if that's just easier to reach for.",
  },
  {
    title: "Branches, history, and stashes",
    body: "Pick a repo from a real dropdown, create a branch, fetch the latest commit, or roll back to an older one - all from the same tab.",
  },
  {
    title: "Streaks, badges, and a push graph",
    body: "Your push history turns into a GitHub-style contribution graph, with streaks and badges for sticking with it.",
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <section className="container" style={{ paddingTop: 72, paddingBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>
              Upload. Edit. Push.
            </p>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08, color: "var(--paper)" }}>
              Edit code and push to GitHub from whatever you&apos;re holding.
            </h1>
            <p style={{ marginTop: 20, fontSize: 18, color: "var(--paper-dim)", maxWidth: 480 }}>
              T3RRI HUB is a browser workspace for developers: upload files or a whole zip, edit them,
              and commit straight to GitHub. Works the same on a phone, a tablet, or a full desktop.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <SignInButton provider="github">Continue with GitHub</SignInButton>
              <SignInButton provider="google" className="btn">
                Continue with Google
              </SignInButton>
            </div>
          </div>

          <HeroDiffPanel />
        </div>
      </section>

      <section className="container" style={{ paddingTop: 40, paddingBottom: 56 }}>
        <p className="eyebrow" style={{ marginBottom: 24 }}>
          How it works
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {STEPS.map((step) => (
            <div key={step.n} className="card" style={{ padding: 24 }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)", fontSize: 14 }}>
                {step.n}
              </span>
              <h3 style={{ marginTop: 12, fontSize: 20, color: "var(--paper)" }}>{step.title}</h3>
              <p style={{ marginTop: 10, color: "var(--paper-dim)", fontSize: 15 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ paddingTop: 24, paddingBottom: 72 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 17, color: "var(--paper)" }}>{f.title}</h3>
              <p style={{ marginTop: 8, color: "var(--paper-dim)", fontSize: 15 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
