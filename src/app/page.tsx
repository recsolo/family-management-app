"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { AuthPanel } from "@/components/auth-panel";
import { FamilyFlowApp } from "@/components/familyflow-app";
import { WorkspaceRecoveryPanel } from "@/components/workspace-recovery-panel";
import type { AppState } from "@/lib/familyflow";
import type { HouseholdMember, HouseholdRole } from "@/lib/workspace";

type WorkspaceResponse = {
  currentUserId: string;
  householdName: string;
  inviteCode: string;
  role: HouseholdRole;
  members: HouseholdMember[];
  state: AppState;
};

export default function Page() {
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_26%),linear-gradient(135deg,_#f7f0e3_0%,_#ead7b6_45%,_#dbe9e4_100%)] p-8 text-stone-900">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-stone-900/10 bg-white/85 p-8 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500">FamilyFlow AI</p>
          <h1 className="mt-4 font-serif text-4xl">Loading your household workspace...</h1>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <AuthPanel onSuccess={() => window.location.reload()} />;
  }

  if (error === "Workspace not found") {
    return <WorkspaceRecoveryPanel error={error} onRecovered={(nextWorkspace) => { setError(null); setWorkspace(nextWorkspace); }} />;
  }

  if (error || !workspace) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_26%),linear-gradient(135deg,_#f7f0e3_0%,_#ead7b6_45%,_#dbe9e4_100%)] p-8 text-stone-900">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white/90 p-8 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-700">Workspace error</p>
          <h1 className="mt-4 font-serif text-4xl">We couldn&apos;t load the household workspace.</h1>
          <p className="mt-4 text-sm leading-6 text-stone-700">{error ?? "Unknown error."}</p>
        </div>
      </main>
    );
  }

  return (
    <FamilyFlowApp
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
