"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/dal";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/stages";
import type { DayStatus } from "@/lib/types";

function forwardMessage(stage: Stage, rep: string): string {
  switch (stage) {
    case "proof_sent":
      return `Proof sent to ${rep}`;
    case "approved":
      return "Proof marked approved";
    case "scheduled":
      return "Scheduled for press";
    case "on_press":
      return "Production started";
    case "finishing":
      return "Moved to finishing";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "invoiced":
      return "Invoice sent";
    case "paid":
      return "Payment received";
    default:
      return `Moved to ${STAGE_LABEL[stage]}`;
  }
}

/** Moves an order one step forward or back, and records it in the history. */
export async function moveStage(formData: FormData) {
  const { supabase, user, org } = await requireShop();
  const id = String(formData.get("orderId") ?? "");
  const back = formData.get("dir") === "back";

  const { data: order } = await supabase
    .from("orders")
    .select("id, number, stage, contact:contacts(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!order) return;

  const idx = STAGES.indexOf(order.stage as Stage);
  const next = STAGES[idx + (back ? -1 : 1)];
  if (!next) return;

  const { error } = await supabase.from("orders").update({ stage: next }).eq("id", id);
  if (error) throw new Error("Couldn't move this order. Refresh and try again.");

  const contact = order.contact as unknown as { full_name: string } | null;
  await supabase.from("order_events").insert({
    organization_id: org.id,
    order_id: id,
    actor_id: user.id,
    message: back ? `Moved back to ${STAGE_LABEL[next]}` : forwardMessage(next, contact?.full_name ?? "the rep"),
    visible_to_rep: !back,
  });

  revalidatePath(`/orders/${order.number}`);
  revalidatePath("/today");
}

const STATUSES: DayStatus[] = ["open", "limited", "full", "closed"];

/** Owners set a day to open, limited, full or closed. Reps see it right away. */
export async function setDayStatus(formData: FormData) {
  const { supabase, org, membership } = await requireShop();
  if (membership.role !== "owner") return;
  const day = String(formData.get("day") ?? "");
  const status = String(formData.get("status") ?? "") as DayStatus;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !STATUSES.includes(status)) return;

  const { error } = await supabase
    .from("capacity_days")
    .upsert({ organization_id: org.id, day, status }, { onConflict: "organization_id,day" });
  if (error) throw new Error("Couldn't save that day. Refresh and try again.");

  revalidatePath("/calendar");
  revalidatePath("/today");
}
