// A hand-rolled Auth.js Adapter backed by the Gist store in db.js,
// used in place of @auth/prisma-adapter now that there's no Postgres.
//
// Session strategy is "jwt" (see src/auth.js), so createSession /
// getSessionAndUser / updateSession / deleteSession aren't actually
// exercised today - they're implemented anyway so switching session
// strategies later, or adding an email/magic-link provider, doesn't
// mean coming back to rewrite this file.

import * as db from "@/lib/db";

function toDate(value) {
  return value ? new Date(value) : value ?? null;
}

function toAdapterUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    emailVerified: toDate(user.emailVerified),
    image: user.image ?? null,
  };
}

export function GistAdapter() {
  return {
    async createUser(data) {
      return toAdapterUser(await db.createUser(data));
    },

    async getUser(id) {
      return toAdapterUser(await db.getUserById(id));
    },

    async getUserByEmail(email) {
      return toAdapterUser(await db.getUserByEmail(email));
    },

    async getUserByAccount({ provider, providerAccountId }) {
      return toAdapterUser(await db.getUserByAccount({ provider, providerAccountId }));
    },

    async updateUser(data) {
      return toAdapterUser(await db.updateUserById(data.id, data));
    },

    async deleteUser(id) {
      await db.deleteUserCascade(id);
    },

    async linkAccount(account) {
      await db.linkAccount(account);
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db.unlinkAccount({ provider, providerAccountId });
    },

    async createSession(session) {
      const record = await db.createSession(session);
      return { ...record, expires: toDate(record.expires) };
    },

    async getSessionAndUser(sessionToken) {
      const result = await db.getSessionAndUser(sessionToken);
      if (!result) return null;
      return {
        session: { ...result.session, expires: toDate(result.session.expires) },
        user: toAdapterUser(result.user),
      };
    },

    async updateSession(data) {
      const updated = await db.updateSession(data);
      return updated ? { ...updated, expires: toDate(updated.expires) } : null;
    },

    async deleteSession(sessionToken) {
      await db.deleteSession(sessionToken);
    },

    async createVerificationToken(data) {
      const record = await db.createVerificationToken(data);
      return { ...record, expires: toDate(record.expires) };
    },

    async useVerificationToken(params) {
      const record = await db.useVerificationToken(params);
      return record ? { ...record, expires: toDate(record.expires) } : null;
    },
  };
}
