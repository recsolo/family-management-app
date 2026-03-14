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
    <main className="family-stage overflow-hidden px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <section className="family-panel family-animate-rise overflow-hidden rounded-[42px] p-4 md:p-5">
          <div className="family-card family-card-dark family-grid-lines rounded-[34px] p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="family-badge family-badge-gold">White Gild edition</span>
              <span className="rounded-full border border-[rgba(241,214,136,0.22)] bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-200">
                Household OS
              </span>
            </div>

            <div className="mt-8 max-w-4xl">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">FamilyFlow AI</p>
              <h1 className="mt-5 font-serif text-6xl leading-[0.9] text-white sm:text-7xl">
                A bright premium system for the family.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">
                Meals, money, reminders, routines, and AI planning stay together in one elegant shared workspace instead of disappearing across tabs and texts.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="family-badge family-badge-gold">Pantry-first meals</span>
              <span className="family-badge family-badge-accent">Private AI context</span>
              <span className="family-badge family-badge-warm">Invite-based households</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="family-panel rounded-[30px] p-6 md:p-7">
              <p className="family-kicker family-eyebrow">What it feels like</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-[var(--foreground)]">
                Crisp, polished, and calm enough for everyday home life.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
                The visual system leans bright and premium, with black anchors for confidence and gold utility accents that make important actions easy to spot.
              </p>
            </article>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <article className="family-side-stat">
                <p className="family-kicker">Meals</p>
                <h3 className="mt-3 font-serif text-3xl">Pantry smart</h3>
                <p className="mt-3 text-sm leading-6 text-stone-200">Lower-waste suggestions from what the house already has.</p>
              </article>
              <article className="family-card family-card-gold rounded-[24px] p-5">
                <p className="family-kicker family-eyebrow">Budget</p>
                <h3 className="mt-3 font-serif text-3xl text-[var(--foreground)]">Clearer money</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Coaching shaped by real household context and planning style.</p>
              </article>
              <article className="family-panel rounded-[24px] p-5">
                <p className="family-kicker family-eyebrow">Ops</p>
                <h3 className="mt-3 font-serif text-3xl text-[var(--foreground)]">Shared rhythm</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Chores, reminders, and routines in one calmer home base.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="family-panel family-animate-rise rounded-[42px] border-[rgba(228,192,92,0.22)] p-7 md:p-9">
          <div className="family-card family-card-soft rounded-[28px] p-4">
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
                  className={`family-btn px-4 py-2 text-sm ${mode === value ? "family-btn-primary" : "family-btn-soft"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-[1.02fr_0.98fr]">
            <div className="family-panel rounded-[30px] p-6">
              <p className="family-kicker family-eyebrow">
                {mode === "signin" ? "Welcome back" : mode === "create" ? "Start your workspace" : "Join your family"}
              </p>
              <h2 className="mt-4 font-serif text-5xl leading-[0.98]">
                {mode === "signin"
                  ? "Sign in to your shared planning space."
                  : mode === "create"
                    ? "Create a beautiful home base for your family."
                    : "Use your invite code to join the household."}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {mode === "signin"
                  ? "Pick up exactly where your household left off."
                  : mode === "create"
                    ? "You will become the household owner and invite others afterward."
                    : "Your account will connect to the existing family workspace."}
              </p>
            </div>

            <div className="family-card family-card-dark rounded-[30px] rounded-bl-[64px] px-5 py-5 text-sm leading-7">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Access note</p>
              <p className="mt-4">
                {mode === "signin"
                  ? "Sign in with the account already linked to your household."
                  : mode === "create"
                    ? "Create the household once, then invite family members into the same shared system."
                    : "Use the invite code from an existing household to reconnect to the same shared data."}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {(mode === "create" || mode === "join") && (
              <label className="block text-sm font-medium text-stone-700">
                Your name
                <input value={name} onChange={(event) => setName(event.target.value)} className="family-input mt-2" />
              </label>
            )}
            <label className="block text-sm font-medium text-stone-700">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="family-input mt-2" />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="family-input mt-2" />
            </label>
            {mode === "create" && (
              <label className="block text-sm font-medium text-stone-700">
                Household name
                <input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="family-input mt-2" />
              </label>
            )}
            {mode === "join" && (
              <label className="block text-sm font-medium text-stone-700">
                Invite code
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  className="family-input mt-2 uppercase tracking-[0.24em]"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm leading-6 text-rose-900">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
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
              className="family-btn family-btn-primary min-w-[13rem]"
            >
              {busy ? "Working..." : mode === "signin" ? "Sign in" : mode === "create" ? "Create workspace" : "Join household"}
            </button>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Your data stays inside the household workspace and powers the AI planning context.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
