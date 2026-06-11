"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AuthPanel } from "@/components/auth-panel";
import { getMemberProfilePath } from "@/lib/workspace-tabs";

export default function Page() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      router.replace(getMemberProfilePath(session.user.id));
    }
  }, [router, session?.user?.id, status]);

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
        <div className="family-stage__glow family-stage__glow--one" />
        <div className="family-stage__glow family-stage__glow--two" />
        <div className="family-stage__glow family-stage__glow--three" />
        <div className="mx-auto max-w-3xl rounded-[36px] border border-[var(--line-strong)] bg-white/82 p-4 shadow-[var(--shadow-panel)] backdrop-blur md:p-5">
          <div className="family-panel rounded-[32px] p-8 md:p-10">
            <p className="family-kicker family-eyebrow">FamilyFlow AI</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight">Opening your profile...</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AuthPanel
      onSuccess={(userId) => {
        if (userId) {
          router.replace(getMemberProfilePath(userId));
          return;
        }

        router.refresh();
      }}
    />
  );
}
