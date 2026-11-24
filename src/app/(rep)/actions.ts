"use server";

import { revalidatePath } from "next/cache";
import { BOOKABLE, evaluate } from "@/lib/booking";
import { requireRep } from "@/lib/dal";
import { loadBookingInput } from "@/lib/rep-booking";

export type HoldResult = { ok: true; date: string; rush: boolean } | { ok: false; message: string };

/** Holds an in-hands date for the rep, after re-checking the shop's rules. */
export async function createHold(date: string, pieces: number, decoration: string): Promise<HoldResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Pick a date first." };
  const count = Math.round(Number(pieces));
  if (!Number.isFinite(count) || count < 1 || count > 5000) {
    return { ok: false, message: "Enter how many pieces you need." };
  }

  const { ctx, input } = await loadBookingInput(count);
  const answer = evaluate(date, input);
  if (!BOOKABLE.includes(answer.kind)) {
    return { ok: false, message: "That date just filled up. Pick another day." };
  }

  const expires = new Date(Date.now() + ctx.rules.hold_hours * 3600 * 1000).toISOString();
  const { error } = await ctx.supabase.from("slot_holds").insert({
    organization_id: ctx.org.id,
    contact_id: ctx.contactId,
    created_by: ctx.user.id,
    in_hands_date: date,
    pieces: count,
    decoration: decoration.slice(0, 40),
    is_rush: answer.kind === "rush",
    expires_at: expires,
  });
  if (error) return { ok: false, message: "Couldn't save the hold. Try again." };

  revalidatePath("/rep");
  revalidatePath("/rep/book");
  return { ok: true, date, rush: answer.kind === "rush" };
}

export async function releaseHold(formData: FormData) {
  const { supabase } = await requireRep();
  const id = String(formData.get("holdId") ?? "");
  await supabase.from("slot_holds").update({ status: "released" }).eq("id", id);
  revalidatePath("/rep");
  revalidatePath("/rep/book");
}

export async function approveProof(formData: FormData) {
  const { supabase } = await requireRep();
  const id = String(formData.get("orderId") ?? "");
  const number = String(formData.get("number") ?? "");
  const { error } = await supabase.rpc("approve_proof", { p_order: id });
  if (error) throw new Error(error.message);
  revalidatePath("/rep");
  revalidatePath(`/rep/orders/${number}`);
}

export async function requestChanges(formData: FormData) {
  const { supabase } = await requireRep();
  const id = String(formData.get("orderId") ?? "");
  const number = String(formData.get("number") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!note.trim()) return;
  const { error } = await supabase.rpc("request_proof_changes", { p_order: id, p_note: note });
  if (error) throw new Error(error.message);
  revalidatePath(`/rep/orders/${number}`);
}
