"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

type Props = {
  onSuccess: (userId?: string) => void;
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

  async function finishSignIn() {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Sign-in failed. Check your email and password.");
    }

    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const sessionBody = (await sessionResponse.json()) as { user?: { id?: string } };
    onSuccess(sessionBody.user?.id);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "signin") {
        await finishSignIn();
        return;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          name,
          email,
          password,
          householdName,
          inviteCode,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Registration failed.");
      }

      await finishSignIn();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />

      <div className="mx-auto max-w-2xl">
        <section className="family-panel family-animate-rise rounded-[40px] p-5 md:p-6">
          <div className="rounded-[32px] border border-[rgba(228,192,92,0.22)] bg-white/88 p-7 shadow-[var(--shadow-soft)] backdrop-blur md:p-9">
            <p className="family-kicker family-eyebrow">FamilyFlow AI</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.95]">One place for your family.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
              Keep family plans, chores, goals, games, and private spaces together in one app.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                ["signin", "Sign in"],
                ["create", "Create account"],
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

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {(mode === "create" || mode === "join") ? (
                <label className="block text-sm font-medium text-stone-700">
                  Your name
                  <input value={name} onChange={(event) => setName(event.target.value)} className="family-input mt-2" />
                </label>
              ) : null}

              <label className="block text-sm font-medium text-stone-700">
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="family-input mt-2" />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="family-input mt-2" />
              </label>

              {mode === "create" ? (
                <label className="block text-sm font-medium text-stone-700">
                  Family name
                  <input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} className="family-input mt-2" />
                </label>
              ) : null}

              {mode === "join" ? (
                <label className="block text-sm font-medium text-stone-700">
                  Invite code
                  <input
                    value={inviteCode}
                    onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                    className="family-input mt-2 uppercase tracking-[0.24em]"
                  />
                </label>
              ) : null}

              {mode === "join" && inviteHouseholdName ? (
                <p className="text-sm leading-7 text-[var(--muted)]">Joining {inviteHouseholdName}.</p>
              ) : null}

              {error ? <p className="text-sm leading-7 text-rose-700">{error}</p> : null}

              <button type="submit" disabled={busy} className="family-btn family-btn-primary min-w-[12rem]">
                {busy
                  ? "Working..."
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "create"
                      ? "Create account"
                      : "Join family"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
