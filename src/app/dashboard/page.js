import { auth } from "@/auth";
import { SignInButton } from "@/components/AuthButtons";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard — T3RRI HUB" };

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24, color: "var(--paper)" }}>Sign in to open your dashboard</h1>
        <p style={{ color: "var(--paper-dim)", maxWidth: 360 }}>
          GitHub sign-in is what lets T3RRI HUB push commits on your behalf.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <SignInButton provider="github">Continue with GitHub</SignInButton>
          <SignInButton provider="google" className="btn">
            Continue with Google
          </SignInButton>
        </div>
      </main>
    );
  }

  return (
    <DashboardClient
      user={{
        name: session.user?.name,
        image: session.user?.image,
        githubUsername: session.githubUsername,
        hasGithubToken: session.hasGithubToken,
        isAdmin: session.isAdmin,
      }}
    />
  );
}
