import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { initials, themeVars } from "@/lib/theme";
import type { MemberRole, Organization } from "@/lib/types";
import { Icon } from "./Icon";
import { NavLink } from "./NavLink";

const ROLE_LABEL: Record<MemberRole, string> = { owner: "owner", staff: "staff", sales_rep: "sales rep" };

export function ShopShell({
  org,
  name,
  role,
  children,
}: {
  org: Organization;
  name: string;
  role: MemberRole;
  children: React.ReactNode;
}) {
  return (
    <div style={themeVars(org.theme)} className="min-h-screen bg-ground text-ink">
      <div className="stripe" aria-hidden="true" />
      <div className="flex min-h-[calc(100vh-12px)] flex-wrap">
        <nav
          aria-label="Main"
          className="flex flex-[1_1_220px] flex-col gap-4 border-r border-line bg-white px-3.5 py-5"
        >
          <div className="flex items-center gap-2.5 px-1.5">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand text-sm font-extrabold text-on-brand"
            >
              {initials(org.name)}
            </span>
            <span className="text-[17px] leading-tight font-bold">{org.name}</span>
          </div>
          <Link
            href="/intake"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand font-bold text-on-brand hover:brightness-95"
          >
            <Icon name="scan" />
            Scan work order
          </Link>
          <ul className="flex flex-wrap gap-0.5">
            <li className="flex-[1_1_170px]">
              <NavLink href="/today" icon="home">Today</NavLink>
            </li>
            <li className="flex-[1_1_170px]">
              <NavLink href="/orders" icon="orders">Orders</NavLink>
            </li>
            <li className="flex-[1_1_170px]">
              <NavLink href="/calendar" icon="calendar">Calendar</NavLink>
            </li>
          </ul>
          <div className="mt-auto flex flex-col gap-1 border-t border-line px-2 pt-3 text-[13px] text-muted">
            <p>
              Signed in as {name}, {ROLE_LABEL[role]}
            </p>
            <form action={signOut}>
              <button type="submit" className="min-h-9 font-semibold text-brand-text underline">
                Sign out
              </button>
            </form>
            <p className="mt-1">Powered by PressBoard</p>
          </div>
        </nav>
        <main className="min-w-0 flex-[999_1_560px] px-[clamp(16px,3vw,40px)] pt-7 pb-12">{children}</main>
      </div>
    </div>
  );
}
