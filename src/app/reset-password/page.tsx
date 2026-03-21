"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const missingToken = !token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords need to match.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Password reset failed.");
      }

      setSuccess("Password updated. You can sign in now.");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Password reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />

      <div className="mx-auto max-w-xl">
        <section className="family-panel rounded-[40px] p-6 md:p-8">
          <div className="rounded-[32px] border border-[rgba(228,192,92,0.22)] bg-white/88 p-7 shadow-[var(--shadow-soft)] backdrop-blur md:p-9">
            <p className="family-kicker family-eyebrow">FamilyFlow</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.95]">Reset password</h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              {missingToken ? "This page needs a reset link from your email." : "Choose a new password for this account."}
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {missingToken ? null : (
                <>
              <label className="block text-sm font-medium text-stone-700">
                New password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="family-input mt-2" />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="family-input mt-2"
                />
              </label>
                </>
              )}

              {error ? <p className="rounded-[18px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm leading-6 text-rose-700">{error}</p> : null}
              {success ? <p className="rounded-[18px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-800">{success}</p> : null}

              <div className="flex flex-wrap gap-3">
                {!missingToken ? (
                  <button type="submit" disabled={busy} className="family-btn family-btn-primary">
                    {busy ? "Saving..." : "Save new password"}
                  </button>
                ) : null}
                <Link href="/" className={`family-btn ${success ? "family-btn-primary" : "family-btn-soft"}`}>
                  {success ? "Sign in" : "Back to sign in"}
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
