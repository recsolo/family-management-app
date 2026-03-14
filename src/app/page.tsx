"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AuthPanel } from "@/components/auth-panel";
import { getWorkspacePath } from "@/lib/workspace-tabs";

export default function Page() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getWorkspacePath("dashboard"));
    }
  }, [router, status]);

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
        <div className="family-stage__glow family-stage__glow--one" />
        <div className="family-stage__glow family-stage__glow--two" />
        <div className="family-stage__glow family-stage__glow--three" />
        <div className="mx-auto max-w-3xl rounded-[36px] border border-[rgba(228,192,92,0.22)] bg-white/82 p-4 shadow-[var(--shadow-panel)] backdrop-blur md:p-5">
          <div className="family-panel rounded-[32px] p-8 md:p-10">
            <p className="family-kicker family-eyebrow">FamilyFlow AI</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight">Opening your workspace...</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
              Taking you to the dashboard so each planning area has its own dedicated page.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AuthPanel
      onSuccess={() => {
        router.replace(getWorkspacePath("dashboard"));
        router.refresh();
      }}
    />
  );
}
