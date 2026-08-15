import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Privacy — T3RRI HUB" };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: "56px 24px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 32, color: "var(--paper)" }}>Privacy</h1>
        <p style={{ marginTop: 24, color: "var(--paper-dim)" }}>
          Last updated: edit this date when you publish.
        </p>

        <div style={{ marginTop: 32, display: "grid", gap: 24, color: "var(--paper-dim)", lineHeight: 1.7 }}>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>What we collect</h3>
            <p>
              When you sign in with GitHub or Google, we receive your name, email, and profile photo
              from that provider. When you sign in with GitHub specifically, we also receive an access
              token that lets T3RRI HUB push commits to repositories on your behalf. Files you upload
              are held only for your current editing session; nothing is written to a repository until
              you press push.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>How it&apos;s stored</h3>
            <p>
              Your GitHub access token is encrypted before it is stored, and used only to perform the
              pushes you ask for. If you enable notifications, we store your browser&apos;s push
              subscription so we can tell you when a push finishes.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>What we send you</h3>
            <p>
              We&apos;ll email you when you sign up and when a push you started finishes. That&apos;s it.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>Third parties</h3>
            <p>
              T3RRI AI questions are sent to a third-party AI API to generate a response. Don&apos;t
              paste anything into T3RRI AI you wouldn&apos;t want leaving your device.
            </p>
          </section>
          <section>
            <h3 style={{ color: "var(--paper)", fontSize: 18 }}>Contact</h3>
            <p>Questions about this policy: gitlob1542@gmail.com</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
