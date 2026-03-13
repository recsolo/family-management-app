"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type Props = {
  onSuccess: () => void;
};

type Mode = "signin" | "create" | "join";

export function AuthPanel({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Sign-in failed. Check your email and password.");
      setBusy(false);
      return;
    }

    onSuccess();
    setBusy(false);
  }

  async function handleRegister(modeToUse: "create" | "join") {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: modeToUse,
        name,
        email,
        password,
        householdName,
        inviteCode,
      }),
    });

    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Registration failed.");
      setBusy(false);
      return;
    }

    await handleSignIn();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_26%),linear-gradient(135deg,_#f7f0e3_0%,_#ead7b6_45%,_#dbe9e4_100%)] px-5 py-10 text-stone-900 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[36px] bg-[linear-gradient(180deg,rgba(12,58,50,0.95),rgba(34,45,71,0.95))] p-8 text-stone-50 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-stone-300">Stage 4</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight">FamilyFlow AI</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-stone-200">
            Persistent household workspaces are live now. Sign in, create a family workspace, or join one with an invite code.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
              <h2 className="font-serif text-2xl">What you get</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
                <li>Shared chores, reminders, and routines</li>
                <li>AI meal planning from pantry data</li>
                <li>Budget coaching with household context</li>
                <li>Invite-based family workspace access</li>
              </ul>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-5">
              <h2 className="font-serif text-2xl">How access works</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
                <li>Create a household and invite family members</li>
                <li>Or join an existing household with its invite code</li>
                <li>Your workspace is now saved in the database</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-stone-900/10 bg-white/85 p-8 shadow-[0_20px_45px_rgba(65,48,32,0.12)]">
          <div className="flex flex-wrap gap-3">
            {[
              ["signin", "Sign in"],
              ["create", "Create household"],
              ["join", "Join household"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value as Mode)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === value ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {(mode === "create" || mode === "join") && (
              <label className="block text-sm font-medium text-stone-700">
                Your name
                <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" />
              </label>
            )}
            <label className="block text-sm font-medium text-stone-700">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" />
            </label>
            {mode === "create" && (
              <label className="block text-sm font-medium text-stone-700">
                Household name
                <input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3" />
              </label>
            )}
            {mode === "join" && (
              <label className="block text-sm font-medium text-stone-700">
                Invite code
                <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className="mt-2 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 uppercase tracking-[0.2em]" />
              </label>
            )}
          </div>

          {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (mode === "signin") {
                void handleSignIn();
                return;
              }

              void handleRegister(mode);
            }}
            className="mt-6 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Working..." : mode === "signin" ? "Sign in" : mode === "create" ? "Create workspace" : "Join household"}
          </button>
        </section>
      </div>
    </main>
  );
}
