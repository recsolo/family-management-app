import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      householdId: string | null;
      householdName: string | null;
      householdInviteCode: string | null;
    };
  }

  interface User {
    householdId?: string | null;
    householdName?: string | null;
    householdInviteCode?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    householdId?: string | null;
    householdName?: string | null;
    householdInviteCode?: string | null;
  }
}
