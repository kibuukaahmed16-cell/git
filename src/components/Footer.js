import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 80 }}>
      <div
        className="container"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 24px",
          fontSize: 14,
          color: "var(--paper-dim)",
        }}
      >
        <span>&copy; {new Date().getFullYear()} T3RRI HUB</span>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/faq" style={{ color: "var(--paper-dim)" }}>
            FAQ
          </Link>
          <Link href="/changelog" style={{ color: "var(--paper-dim)" }}>
            Changelog
          </Link>
          <Link href="/privacy" style={{ color: "var(--paper-dim)" }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ color: "var(--paper-dim)" }}>
            Terms
          </Link>
        </div>

        <a
          href="https://github.com/what-sapp"
          target="_blank"
          rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--paper-dim)", textDecoration: "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://github.com/what-sapp.png"
            alt=""
            width={20}
            height={20}
            style={{ borderRadius: "50%" }}
          />
          Built by Terri
        </a>
      </div>
    </footer>
  );
}
