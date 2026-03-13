import type { DefaultSession } from "next-auth";
import type { HouseholdRole } from "@/lib/workspace";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      householdId: string | null;
      householdName: string | null;
      householdInviteCode: string | null;
      householdRole: HouseholdRole | null;
    };
  }

  interface User {
    householdId?: string | null;
    householdName?: string | null;
    householdInviteCode?: string | null;
    householdRole?: HouseholdRole | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    householdId?: string | null;
    householdName?: string | null;
    householdInviteCode?: string | null;
    householdRole?: HouseholdRole | null;
  }
}
