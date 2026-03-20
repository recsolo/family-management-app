"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Checking your link...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This email link is missing a token.");
      return;
    }

    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { error?: string; status?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "This email link could not be used.");
        }

        setState("success");
        setMessage(body.status === "already-verified" ? "Your email is already verified." : "Your email is verified. You can sign in now.");
      })
      .catch((error: unknown) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "This email link could not be used.");
      });
  }, [token]);

  return (
    <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="family-stage__glow family-stage__glow--one" />
      <div className="family-stage__glow family-stage__glow--two" />
      <div className="family-stage__glow family-stage__glow--three" />

      <div className="mx-auto max-w-xl">
        <section className="family-panel rounded-[40px] p-6 md:p-8">
          <div className="rounded-[32px] border border-[rgba(228,192,92,0.22)] bg-white/88 p-7 shadow-[var(--shadow-soft)] backdrop-blur md:p-9">
            <p className="family-kicker family-eyebrow">FamilyFlow</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.95]">
              {state === "loading" ? "Verifying..." : state === "success" ? "Email ready" : "Link problem"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{message}</p>
            <div className="mt-8">
              <Link href="/" className="family-btn family-btn-primary">
                Back to sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
