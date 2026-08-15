import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Terms — T3RRI HUB" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 32, color: "var(--paper)" }}>Terms</h1>
        <p style={{ marginTop: 24, color: "var(--paper-dim)" }}>
          Last updated: edit this date when you publish.
        </p>

        <div style={{ marginTop: 32, display: "grid", gap: 24, color: "var(--paper-dim)", lineHeight: 1.7 }}>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>Using T3RRI HUB</h3>
            <p>
              T3RRI HUB lets you edit files in your browser and push them to repositories you control on
              GitHub. You&apos;re responsible for what you push, including making sure you have the
              right to push it to the repository you target.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>T3RRI AI</h3>
            <p>
              T3RRI AI is provided as a convenience and can be wrong. Review anything it suggests before
              relying on it, the same way you would with a search result.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>No warranty</h3>
            <p>
              T3RRI HUB is provided as-is, without warranty of any kind. Back up anything important
              before pushing over it, especially when using force push.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>Contact</h3>
            <p>gitlob1542@gmail.com</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
