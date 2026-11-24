import { redirect } from "next/navigation";
import { getContext } from "@/lib/dal";

// Sends each person to their side of the app.
export default async function Home() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) redirect("/no-access");
  redirect(ctx.membership.role === "sales_rep" ? "/rep" : "/today");
}
