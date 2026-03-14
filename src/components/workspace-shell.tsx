"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AuthPanel } from "@/components/auth-panel";
import { FamilyFlowApp } from "@/components/familyflow-app";
import { WorkspaceRecoveryPanel } from "@/components/workspace-recovery-panel";
import type { AppState } from "@/lib/familyflow";
import type { ActiveTab } from "@/lib/workspace-tabs";
import { getWorkspacePath } from "@/lib/workspace-tabs";
import type { HouseholdMember, HouseholdRole } from "@/lib/workspace";

type WorkspaceResponse = {
  currentUserId: string;
  householdName: string;
  inviteCode: string;
  role: HouseholdRole;
  members: HouseholdMember[];
  state: AppState;
};

type Props = {
  activeTab: ActiveTab;
};

export function WorkspaceShell({ activeTab }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    void fetch("/api/workspace")
      .then(async (response) => {
        const body = (await response.json()) as WorkspaceResponse & { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "Workspace load failed.");
        }
        if (!cancelled) {
          setError(null);
          setWorkspace(body);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setWorkspace(null);
          setError(fetchError instanceof Error ? fetchError.message : "Workspace load failed.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const loadingWorkspace = status === "authenticated" && !workspace && !error;

  if (status === "loading" || loadingWorkspace) {
    return (
      <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
        <div className="family-stage__glow family-stage__glow--one" />
        <div className="family-stage__glow family-stage__glow--two" />
        <div className="family-stage__glow family-stage__glow--three" />
        <div className="mx-auto max-w-3xl rounded-[36px] border border-[rgba(228,192,92,0.22)] bg-white/82 p-4 shadow-[var(--shadow-panel)] backdrop-blur md:p-5">
          <div className="family-panel rounded-[32px] p-8 md:p-10">
            <p className="family-kicker family-eyebrow">FamilyFlow AI</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight">Loading your household workspace...</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
              Pulling in your shared meals, budget, routines, reminders, and household context.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <AuthPanel
        onSuccess={() => {
          router.replace(getWorkspacePath(activeTab));
          router.refresh();
        }}
      />
    );
  }

  if (error === "Workspace not found") {
    return (
      <WorkspaceRecoveryPanel
        error={error}
        onRecovered={(nextWorkspace) => {
          setError(null);
          setWorkspace(nextWorkspace);
        }}
      />
    );
  }

  if (error || !workspace) {
    return (
      <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
        <div className="family-stage__glow family-stage__glow--one" />
        <div className="family-stage__glow family-stage__glow--two" />
        <div className="family-stage__glow family-stage__glow--three" />
        <div className="mx-auto max-w-3xl rounded-[36px] border border-rose-200/70 bg-white/82 p-4 shadow-[var(--shadow-panel)] backdrop-blur md:p-5">
          <div className="family-panel rounded-[32px] border border-rose-200/80 p-8 md:p-10">
            <p className="family-kicker text-rose-700">Workspace error</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight">We couldn&apos;t load the household workspace.</h1>
            <p className="mt-4 text-sm leading-7 text-stone-700">{error ?? "Unknown error."}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <FamilyFlowApp
      activeTab={activeTab}
      currentUserId={workspace.currentUserId}
      householdName={workspace.householdName}
      inviteCode={workspace.inviteCode}
      initialState={workspace.state}
      members={workspace.members}
      role={workspace.role}
      userName={session.user?.name ?? "Family member"}
    />
  );
}
