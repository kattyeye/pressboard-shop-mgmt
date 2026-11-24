import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Membership, Organization, ShopRules } from "./types";

// One place that reads the session and the user's shop. Every page and
// action goes through here; row level security in the database is the
// real gate, this only routes people to the right side of the app.
export const getContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("memberships").select("role, organization_id, contact_id").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const membership = ((memberships ?? [])[0] ?? null) as Membership | null;
  let org: Organization | null = null;
  let rules: ShopRules | null = null;
  if (membership) {
    const [orgRes, rulesRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug, time_zone, theme")
        .eq("id", membership.organization_id)
        .single(),
      supabase.from("shop_rules").select("*").eq("organization_id", membership.organization_id).single(),
    ]);
    org = orgRes.data as Organization | null;
    rules = rulesRes.data as ShopRules | null;
  }

  return {
    supabase,
    user,
    name: (profile?.full_name as string | undefined) || user.email || "You",
    membership,
    org,
    rules,
  };
});

export async function requireShop() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership || !ctx.org || !ctx.rules) redirect("/no-access");
  if (ctx.membership.role === "sales_rep") redirect("/rep");
  return { ...ctx, membership: ctx.membership, org: ctx.org, rules: ctx.rules };
}

export async function requireRep() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership || !ctx.org || !ctx.rules) redirect("/no-access");
  if (ctx.membership.role !== "sales_rep" || !ctx.membership.contact_id) redirect("/today");
  return {
    ...ctx,
    membership: ctx.membership,
    org: ctx.org,
    rules: ctx.rules,
    contactId: ctx.membership.contact_id,
  };
}
