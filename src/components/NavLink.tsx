"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export function NavLink({
  href,
  icon,
  children,
  variant = "rail",
}: {
  href: string;
  icon: IconName;
  children: React.ReactNode;
  variant?: "rail" | "tab";
}) {
  const path = usePathname();
  const active =
    href === "/rep"
      ? path === "/rep" || path.startsWith("/rep/orders")
      : path === href || path.startsWith(href + "/");

  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] text-[13px] ${
          active ? "bg-brand-tint font-bold text-brand-text" : "font-semibold text-ink"
        }`}
      >
        <Icon name={icon} size={22} />
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 ${
        active ? "bg-brand-tint font-bold text-brand-text" : "text-ink hover:bg-hover"
      }`}
    >
      <Icon name={icon} />
      {children}
    </Link>
  );
}
