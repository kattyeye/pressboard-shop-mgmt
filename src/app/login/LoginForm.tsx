"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEMO_ACCOUNTS = [
  { email: "frances@example.com", who: "Frances", what: "Shop owner: Today, orders, calendar" },
  { email: "jamie@example.com", who: "Jamie", what: "Shop staff: production, no rule changes" },
  { email: "marcus@example.com", who: "Marcus Lee", what: "Sales rep at Baker's: his orders, booking" },
];

export function LoginForm({ demoPassword }: { demoPassword: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function signIn(e: string, p: string, key: string) {
    setBusy(key);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (err) {
      setError("That email and password don't match. Check them and try again.");
      setBusy(null);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {demoPassword && (
        <section aria-labelledby="demo-h" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
          <h2 id="demo-h" className="text-base font-bold">
            Try the demo shop
          </h2>
          <p className="text-sm text-muted">Sample data only. Sign in as one of these people:</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              disabled={busy !== null}
              onClick={() => signIn(a.email, demoPassword, a.email)}
              className="flex min-h-14 flex-col items-start justify-center rounded-xl border border-line px-4 py-2 text-left hover:bg-hover disabled:opacity-60"
            >
              <span className="font-bold">{busy === a.email ? "Signing in…" : a.who}</span>
              <span className="text-sm text-muted">{a.what}</span>
            </button>
          ))}
        </section>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          signIn(email.trim(), password, "form");
        }}
      >
        <label className="flex flex-col gap-1.5 font-bold">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-white px-3.5 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 font-bold">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 rounded-xl border border-line bg-white px-3.5 font-normal"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-text">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy !== null}
          className="min-h-12 rounded-xl bg-brand font-bold text-on-brand hover:brightness-95 disabled:opacity-60"
        >
          {busy === "form" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
