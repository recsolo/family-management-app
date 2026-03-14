"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

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

type Props = {
  error: string;
  onRecovered: (workspace: WorkspaceResponse) => void;
};

type Mode = "create" | "join";

export function WorkspaceRecoveryPanel({ error, onRecovered }: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  async function handleRecover() {
    setBusy(true);
    setRecoveryError(null);

    const response = await fetch("/api/workspace/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "create"
          ? { mode: "create", householdName }
          : { mode: "join", inviteCode },
      ),
    });

    const body = (await response.json()) as WorkspaceResponse & { error?: string };
    setBusy(false);

    if (!response.ok) {
      setRecoveryError(body.error ?? "Workspace recovery failed.");
      return;
    }

    onRecovered(body);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_26%),linear-gradient(135deg,_#f7f0e3_0%,_#ead7b6_45%,_#dbe9e4_100%)] p-8 text-stone-900">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-amber-200 bg-white/90 p-8 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700">Workspace recovery</p>
        <h1 className="mt-4 font-serif text-4xl">This account is signed in, but it is not linked to a household yet.</h1>
        <p className="mt-4 text-sm leading-6 text-stone-700">{error}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "create" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
          >
            Create household
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "join" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
          >
            Join household
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {mode === "create" ? (
            <label className="block text-sm font-medium text-stone-700">
              Household name
              <input
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3"
              />
            </label>
          ) : (
            <label className="block text-sm font-medium text-stone-700">
              Invite code
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 uppercase tracking-[0.2em]"
              />
            </label>
          )}
        </div>

        {recoveryError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{recoveryError}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleRecover()}
            disabled={busy}
            className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Working..." : mode === "create" ? "Create household" : "Join household"}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
