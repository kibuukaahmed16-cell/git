import { auth } from "@/auth";
import { getUserById, isAdminUser } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminClient from "./AdminClient";

export const metadata = { title: "Admin — T3RRI HUB" };

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user?.id ? await getUserById(session.user.id) : null;
  const allowed = await isAdminUser(user);

  if (!allowed) {
    return (
      <>
        <Navbar />
        <main className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, color: "var(--paper)" }}>Admin access required</h1>
          <p style={{ marginTop: 12, color: "var(--paper-dim)" }}>
            {session ? "Your account isn't on the admin allowlist." : "Sign in with an admin account to view this page."}
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return <AdminClient />;
}
