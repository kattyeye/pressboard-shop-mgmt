import { signOut } from "@/app/auth-actions";
import { initials, themeVars } from "@/lib/theme";
import type { Organization } from "@/lib/types";
import { NavLink } from "./NavLink";

export function RepShell({
  org,
  name,
  children,
}: {
  org: Organization;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div style={themeVars(org.theme)} className="min-h-screen bg-ground text-ink">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-ground">
        <div className="stripe" aria-hidden="true" />
        <header className="flex items-center justify-between gap-2.5 border-b border-line bg-white px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] bg-brand text-sm font-extrabold text-on-brand"
            >
              {initials(org.name)}
            </span>
            <span className="font-bold">{org.name}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label={`${name}. Sign out`}
              title="Sign out"
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-line bg-hover px-3 text-sm font-bold"
            >
              {initials(name)}
            </button>
          </form>
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">{children}</main>
        <nav
          aria-label="Rep"
          className="sticky bottom-0 grid grid-cols-2 gap-1 border-t border-line bg-white px-2 pt-1.5 pb-2.5"
        >
          <NavLink href="/rep" icon="orders" variant="tab">My orders</NavLink>
          <NavLink href="/rep/book" icon="book" variant="tab">Book</NavLink>
        </nav>
      </div>
    </div>
  );
}
