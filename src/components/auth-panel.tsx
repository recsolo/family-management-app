"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type Props = {
  onSuccess: () => void;
};

type Mode = "signin" | "create" | "join";

export function AuthPanel({ onSuccess }: Props) {
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryInviteCode = searchParams.get("inviteCode")?.toUpperCase() ?? "";
  const inviteHouseholdName = searchParams.get("household")?.trim() ?? "";
  const defaultMode: Mode =
    queryMode === "create" || queryMode === "signin"
      ? queryMode
      : queryMode === "join" || queryInviteCode
        ? "join"
        : "signin";

  const [modeOverride, setModeOverride] = useState<Mode | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mode = modeOverride ?? defaultMode;
  const inviteCode = inviteCodeInput ?? queryInviteCode;

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
                Shared family app
              </span>
            </div>

            <div className="mt-8 max-w-4xl">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">FamilyFlow AI</p>
              <h1 className="mt-5 font-serif text-6xl leading-[0.9] text-white sm:text-7xl">
                Team up at home.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">
                Keep meals, money, chores, reminders, routines, and AI help in one easy family space.
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
              <p className="family-kicker family-eyebrow">What you can do</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-[var(--foreground)]">
                Easy enough for everyone to use.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
                It keeps family plans in one place so nobody has to hunt through texts, notes, or memory.
              </p>
            </article>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <article className="family-side-stat">
                <p className="family-kicker">Meals</p>
                <h3 className="mt-3 font-serif text-3xl">Pick tonight&apos;s meal</h3>
                <p className="mt-3 text-sm leading-6 text-stone-200">Get meal ideas from what is already at home.</p>
              </article>
              <article className="family-card family-card-gold rounded-[24px] p-5">
                <p className="family-kicker family-eyebrow">Budget</p>
                <h3 className="mt-3 font-serif text-3xl text-[var(--foreground)]">See your money plan</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Check the plan and get AI help.</p>
              </article>
              <article className="family-panel rounded-[24px] p-5">
                <p className="family-kicker family-eyebrow">Ops</p>
                <h3 className="mt-3 font-serif text-3xl text-[var(--foreground)]">Work together</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Track chores, reminders, and routines together.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="family-panel family-animate-rise rounded-[42px] border-[rgba(228,192,92,0.22)] p-7 md:p-9">
          <div className="family-card family-card-soft rounded-[28px] p-4">
            <div className="flex flex-wrap gap-3">
              {[
                ["signin", "Sign in"],
                ["create", "Create family"],
                ["join", "Join family"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setModeOverride(value as Mode)}
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
                {mode === "signin" ? "Welcome back" : mode === "create" ? "Start here" : "Join your family"}
              </p>
              <h2 className="mt-4 font-serif text-5xl leading-[0.98]">
                {mode === "signin"
                  ? "Jump back into your family space."
                  : mode === "create"
                    ? "Create a family space."
                    : inviteHouseholdName
                      ? `Join ${inviteHouseholdName}.`
                      : "Join your family."}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {mode === "signin"
                  ? "Pick up where your family left off."
                  : mode === "create"
                    ? "You will be the owner and can invite everyone else after setup."
                    : "Use the link or code your family sent you."}
              </p>
            </div>

            <div className="family-card family-card-dark rounded-[30px] rounded-bl-[64px] px-5 py-5 text-sm leading-7">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Access note</p>
              <p className="mt-4">
                {mode === "signin"
                  ? "Use the account already linked to your household."
                  : mode === "create"
                    ? "Create the family space once, then invite everyone else."
                    : "Use the invite link or code to join the same shared space."}
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
                  onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
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
              {busy ? "Working..." : mode === "signin" ? "Sign in" : mode === "create" ? "Create family space" : "Join family"}
            </button>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Your household data stays together and powers the AI tools.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
