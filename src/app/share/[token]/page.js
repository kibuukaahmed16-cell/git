import { getShareLink } from "@/lib/db";
import ShareViewer from "./ShareViewer";

export const metadata = { title: "Shared files — T3RRI HUB" };

export default async function SharePage({ params }) {
  const { token } = await params;
  const link = await getShareLink(token);

  if (!link) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 22, color: "var(--paper)" }}>This link is invalid or has expired</h1>
        <p style={{ color: "var(--paper-dim)" }}>Share links last 14 days from creation.</p>
      </main>
    );
  }

  return <ShareViewer repoFullName={link.repoFullName} files={link.files} />;
}
