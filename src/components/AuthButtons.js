// Server Component only - these buttons use inline Server Actions
// ("use server" closures below), which only compile to safe client
// stubs when this file is rendered through the RSC pipeline (i.e.
// imported from another Server Component, like Navbar.js).
//
// Do NOT import this file from a "use client" component. A Client
// Component pulls its imports into the browser bundle directly, which
// drags in this file's `@/auth` import (and everything auth.js itself
// imports - nodemailer, the Gist DB layer, etc.) as real source code
// instead of a stub. nodemailer needs Node's `net`/`tls`, which don't
// exist in a browser, so the production build fails outright. If a
// client component needs to sign out, import `signOut` from
// "next-auth/react" directly instead (see DashboardClient.js).
import { signIn, signOut } from "@/auth";

export function SignInButton({ provider, children, className = "btn btn-primary" }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(provider, { redirectTo: "/dashboard" });
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

export function SignOutButton({ className = "btn" }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
