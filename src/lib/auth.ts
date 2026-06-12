import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession, type NextAuthOptions } from "next-auth";

import { db } from "@/lib/db";
import { getAppUrl, getAuthRuntimeConfig, getMailConfig } from "@/lib/env";
import { consumeRateLimit, getHeaderClientId } from "@/lib/rate-limit";
import type { HouseholdRole } from "@/lib/workspace";

type AuthRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  household_id: string | null;
  household_name: string | null;
  invite_code: string | null;
  role: HouseholdRole | null;
};

async function findUserByEmail(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: { household: true },
      },
    },
  });

  if (!user) {
    return undefined;
  }

  const membership = user.memberships[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    email_verified_at: user.emailVerifiedAt,
    household_id: membership?.household.id ?? null,
    household_name: membership?.household.name ?? null,
    invite_code: membership?.household.inviteCode ?? null,
    role: (membership?.role as HouseholdRole | undefined) ?? null,
  } satisfies AuthRow;
}

const authRuntime = getAuthRuntimeConfig();

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = getAppUrl();
}

export const authOptions: NextAuthOptions = {
  secret: authRuntime.secret,
  useSecureCookies: authRuntime.useSecureCookies,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();
        const clientId = getHeaderClientId(request.headers);
        const rateLimit = consumeRateLimit({
          key: `login:${clientId}:${normalizedEmail}`,
          windowMs: 15 * 60 * 1000,
          max: 8,
        });
        // Second bucket keyed by email alone so spoofed client IPs cannot
        // brute-force a single account by rotating the per-IP bucket.
        const emailRateLimit = consumeRateLimit({
          key: `login-email:${normalizedEmail}`,
          windowMs: 15 * 60 * 1000,
          max: 20,
        });

        if (!rateLimit.allowed || !emailRateLimit.allowed) {
          console.warn("[FamilyFlow]", {
            scope: "familyflow-auth",
            level: "warn",
            event: "credentials_rate_limited",
            clientId,
            email: normalizedEmail,
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          });
          return null;
        }

        const user = await findUserByEmail(normalizedEmail);
        if (!user) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password_hash);
        if (!isValid) {
          return null;
        }

        if (getMailConfig().configured && !user.email_verified_at) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          householdId: user.household_id,
          householdName: user.household_name,
          householdInviteCode: user.invite_code,
          householdRole: user.role,
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
        token.householdRole = (user as { householdRole?: HouseholdRole | null }).householdRole ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
        session.user.householdId = typeof token.householdId === "string" ? token.householdId : null;
        session.user.householdName = typeof token.householdName === "string" ? token.householdName : null;
        session.user.householdInviteCode = typeof token.householdInviteCode === "string" ? token.householdInviteCode : null;
        session.user.householdRole = typeof token.householdRole === "string" ? (token.householdRole as HouseholdRole) : null;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
