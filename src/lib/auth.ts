import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession, type NextAuthOptions } from "next-auth";

import { db } from "@/lib/db";

type AuthRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  household_id: string | null;
  household_name: string | null;
  invite_code: string | null;
};

function findUserByEmail(email: string) {
  const statement = db.prepare(`
    SELECT users.id, users.name, users.email, users.password_hash, households.id AS household_id, households.name AS household_name, households.invite_code
    FROM users
    LEFT JOIN memberships ON memberships.user_id = users.id
    LEFT JOIN households ON households.id = memberships.household_id
    WHERE users.email = ?
    LIMIT 1
  `);

  return statement.get(email.toLowerCase()) as AuthRow | undefined;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = findUserByEmail(credentials.email);
        if (!user) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          householdId: user.household_id,
          householdName: user.household_name,
          householdInviteCode: user.invite_code,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.householdId = (user as { householdId?: string | null }).householdId ?? null;
        token.householdName = (user as { householdName?: string | null }).householdName ?? null;
        token.householdInviteCode = (user as { householdInviteCode?: string | null }).householdInviteCode ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
        session.user.householdId = typeof token.householdId === "string" ? token.householdId : null;
        session.user.householdName = typeof token.householdName === "string" ? token.householdName : null;
        session.user.householdInviteCode = typeof token.householdInviteCode === "string" ? token.householdInviteCode : null;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
