import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { headers } from "next/headers";
import { GistAdapter } from "@/lib/gistAdapter";
import { updateUserById, addSecurityEvent, isAdminIdentity, getUserSettings } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { sendEmail, welcomeEmail, securityAlertEmail } from "@/lib/email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: GistAdapter(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    GitHub({
      // "repo" is required so T3RRI HUB's push feature can create commits
      // on the user's behalf. Ask for the minimum beyond that.
      authorization: { params: { scope: "read:user user:email repo" } },
      // Both providers verify email ownership, so it's safe to link a
      // GitHub and a Google sign-in to the same account by matching
      // email. Without this, a person who first signs in with Google
      // and later taps "Continue with GitHub" would get a second,
      // disconnected account.
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub;
      session.githubUsername = token.githubUsername || null;
      session.githubAvatarUrl = token.githubAvatarUrl || null;
      session.hasGithubToken = Boolean(token.githubUsername);
      session.isAdmin = Boolean(token.isAdmin);
      return session;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "github") {
        token.githubUsername = profile?.login || token.githubUsername;
        token.githubAvatarUrl = profile?.avatar_url || token.githubAvatarUrl;
      }
      // Only recomputed right after sign-in (when account/profile are
      // present) - cheap allowlist check, no DB round trip needed.
      if (account) {
        token.isAdmin = isAdminIdentity({
          email: profile?.email || user?.email,
          githubUsername: profile?.login,
        });
      }
      return token;
    },
  },
  events: {
    // Persist the encrypted GitHub token so /api/push can use it later,
    // independent of what's in the current session's JWT.
    async signIn({ user, account, profile, isNewUser }) {
      if (account?.provider === "github" && account.access_token && user?.id) {
        await updateUserById(user.id, {
          githubUsername: profile?.login,
          githubAvatarUrl: profile?.avatar_url,
          githubTokenEnc: encryptSecret(account.access_token),
        }).catch((err) => console.error("Failed to store GitHub token:", err));
      }
      if (isNewUser && user?.email) {
        sendEmail({ to: user.email, ...welcomeEmail(user.name) }).catch(() => {});
      }
      // Best-effort security audit trail. headers() only resolves
      // inside a request context; if that ever isn't true here,
      // sign-in must still succeed.
      if (user?.id) {
        try {
          const hdrs = await headers();
          const ip =
            hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || null;
          const userAgent = hdrs.get("user-agent") || null;
          await addSecurityEvent({
            userId: user.id,
            type: isNewUser ? "account_created" : "sign_in",
            ip,
            userAgent,
          });
          // Skip on the very first sign-in - they already got a
          // welcome email, a second email in the same minute reads as
          // noise rather than a useful alert.
          if (!isNewUser && user.email) {
            const settings = await getUserSettings(user.id);
            if (settings.emailOnSignIn) {
              sendEmail({
                to: user.email,
                ...securityAlertEmail({ ip, userAgent, time: new Date().toLocaleString() }),
              }).catch(() => {});
            }
          }
        } catch {
          // non-fatal - see comment above
        }
      }
    },
  },
});
