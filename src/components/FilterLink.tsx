import Link from "next/link";

/** A pill-shaped filter link. The active one is filled. */
export function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-bold ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
