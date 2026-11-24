import { signOut } from "@/app/auth-actions";

export default function NoAccess() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <div className="stripe rounded" aria-hidden="true" />
      <h1 className="text-3xl font-extrabold">You’re signed in, but not part of a shop yet</h1>
      <p className="text-muted">
        Ask the shop owner to invite you, or contact PressBoard support. Once you’re added, sign in again.
      </p>
      <form action={signOut}>
        <button type="submit" className="min-h-11 rounded-xl bg-ink px-5 font-bold text-white">
          Sign out
        </button>
      </form>
    </main>
  );
}
