"use client";

import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryInviteCode = searchParams.get("inviteCode")?.toUpperCase() ?? "";
  const queryHouseholdName = searchParams.get("household")?.trim() ?? "";
  const defaultMode: Mode = queryMode === "join" || queryInviteCode ? "join" : "create";

  const [modeOverride, setModeOverride] = useState<Mode | null>(null);
  const [householdNameInput, setHouseholdNameInput] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const mode = modeOverride ?? defaultMode;
  const householdName = householdNameInput ?? queryHouseholdName;
  const inviteCode = inviteCodeInput ?? queryInviteCode;

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
    <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />

      <div className="mx-auto max-w-5xl rounded-[36px] border border-[rgba(228,192,92,0.22)] bg-white/82 p-4 shadow-[var(--shadow-panel)] backdrop-blur md:p-5">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="family-card family-card-dark family-grid-lines rounded-[32px] p-8 text-stone-50">
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Family setup</p>
            <h1 className="mt-4 max-w-lg font-serif text-5xl leading-tight">
              You&apos;re signed in.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-stone-200">Choose a family to open.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-[rgba(241,214,136,0.18)] bg-white/8 p-5">
                <p className="family-kicker text-[rgba(241,214,136,0.76)]">Create</p>
                <h2 className="mt-3 font-serif text-3xl">New family</h2>
                <p className="mt-3 text-sm leading-6 text-stone-200">Start a new family.</p>
              </div>
              <div className="rounded-[24px] border border-[rgba(241,214,136,0.18)] bg-white/8 p-5">
                <p className="family-kicker text-[rgba(241,214,136,0.76)]">Join</p>
                <h2 className="mt-3 font-serif text-3xl">Join family</h2>
                <p className="mt-3 text-sm leading-6 text-stone-200">Use your invite code.</p>
              </div>
            </div>
          </section>

          <section className="family-panel rounded-[32px] p-7">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setModeOverride("create")}
                className={`family-btn px-4 py-2 text-sm ${mode === "create" ? "family-btn-primary" : "family-btn-soft"}`}
              >
                Create family space
              </button>
              <button
                type="button"
                onClick={() => setModeOverride("join")}
                className={`family-btn px-4 py-2 text-sm ${mode === "join" ? "family-btn-primary" : "family-btn-soft"}`}
              >
                Join family
              </button>
            </div>

            <div className="mt-7">
              <p className="family-kicker family-eyebrow">{mode === "create" ? "Create" : "Join"}</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight">
                {mode === "create" ? "Create a family." : "Enter your invite code."}
              </h2>
            </div>

            <div className="mt-7 space-y-4">
              {mode === "create" ? (
                <label className="block text-sm font-medium text-stone-700">
                  Household name
                  <input
                    value={householdName}
                    onChange={(event) => setHouseholdNameInput(event.target.value)}
                    className="family-input mt-2"
                  />
                </label>
              ) : (
                <label className="block text-sm font-medium text-stone-700">
                  Invite code
                  <input
                    value={inviteCode}
                    onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                    className="family-input mt-2 uppercase tracking-[0.24em]"
                  />
                </label>
              )}
            </div>

            {recoveryError && (
              <p className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm leading-6 text-rose-900">
                {recoveryError}
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleRecover()}
                disabled={busy}
                className="family-btn family-btn-primary"
              >
                {busy ? "Working..." : mode === "create" ? "Create family space" : "Join family"}
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="family-btn family-btn-secondary"
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
