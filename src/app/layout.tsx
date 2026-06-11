import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/providers";
import { getRuntimeSetupIssues } from "@/lib/env";

export const metadata: Metadata = {
  title: "FamilyFlow AI",
  description: "A web-first family assistant for meals, budgets, and everyday planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const setupIssues = getRuntimeSetupIssues();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {setupIssues.length > 0 ? (
          <main className="family-stage overflow-hidden px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
            <div className="family-stage__glow family-stage__glow--one" />
            <div className="family-stage__glow family-stage__glow--two" />
            <div className="family-stage__glow family-stage__glow--three" />

            <div className="mx-auto max-w-5xl space-y-5">
              <section className="family-card family-card-dark family-grid-lines rounded-[40px] p-8 md:p-10">
                <p className="family-kicker text-[var(--on-bold-kicker)]">Local setup required</p>
                <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.95] text-white md:text-6xl">
                  FamilyFlow can&apos;t start local auth yet because the new PostgreSQL setup is incomplete.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-stone-200 md:text-lg">
                  The browser error came from NextAuth trying to fetch session data while the server was returning an HTML error page. The root cause is local configuration, not the redesign.
                </p>
              </section>

              <section className="family-card rounded-[34px] p-6 md:p-8">
                <p className="family-kicker family-eyebrow">What is missing</p>
                <div className="mt-5 space-y-4">
                  {setupIssues.map((issue) => (
                    <article key={issue.key} className="family-sidebar-note">
                      <p className="family-kicker family-eyebrow">{issue.key}</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{issue.message}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="family-card family-card-gold rounded-[34px] p-6 md:p-8">
                <p className="family-kicker family-eyebrow">How to fix local startup</p>
                <ol className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
                  <li>1. Add `DATABASE_URL` to your local `.env` with a PostgreSQL connection string.</li>
                  <li>2. Keep `NEXTAUTH_URL=http://localhost:3000` for local preview.</li>
                  <li>3. Keep a real `NEXTAUTH_SECRET` in the same file.</li>
                  <li>4. Restart `npm run dev` after updating env vars.</li>
                </ol>
                <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
                  If you were using the old SQLite setup, note that `FAMILYFLOW_DB_PATH` is now legacy local config and no longer starts the app by itself.
                </p>
              </section>
            </div>
          </main>
        ) : (
          <Providers>{children}</Providers>
        )}
      </body>
    </html>
  );
}
