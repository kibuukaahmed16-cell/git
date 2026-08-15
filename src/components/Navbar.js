import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { SignInButton } from "./AuthButtons";

export default async function Navbar() {
  const session = await auth();

  return (
    <header style={{ borderBottom: "1px solid var(--line)" }}>
      <div
        className="container"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/icons/icon.svg" alt="" width={32} height={32} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--paper)" }}>
            T3RRI HUB
          </span>
        </Link>

        {session ? (
          <Link href="/dashboard" className="btn btn-primary">
            Open dashboard
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <SignInButton provider="google" className="btn">
              Continue with Google
            </SignInButton>
            <SignInButton provider="github" className="btn btn-primary">
              Continue with GitHub
            </SignInButton>
          </div>
        )}
      </div>
    </header>
  );
}
