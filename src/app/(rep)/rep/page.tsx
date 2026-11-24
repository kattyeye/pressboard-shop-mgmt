import Link from "next/link";
import { GarmentChip } from "@/components/GarmentChip";
import { requireRep } from "@/lib/dal";
import { shortDay, timeIn } from "@/lib/dates";
import { DONE_FOR_REP, REP_PROGRESS, REP_STATUS } from "@/lib/stages";
import { ORDER_SELECT, type OrderRow, type SlotHold } from "@/lib/types";
import { releaseHold } from "../actions";

export default async function RepHome({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase, org, name } = await requireRep();
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "delivered" ? "delivered" : "active";

  const [ordersRes, holdsRes] = await Promise.all([
    supabase.from("orders").select(ORDER_SELECT).order("number", { ascending: false }),
    supabase
      .from("slot_holds")
      .select("id, in_hands_date, pieces, is_rush, status, expires_at, contact:contacts(full_name, customer:customers(short_name))")
      .eq("status", "held")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at"),
  ]);
  const orders = (ordersRes.data ?? []) as unknown as OrderRow[];
  const holds = (holdsRes.data ?? []) as unknown as SlotHold[];
  const active = orders.filter((o) => !DONE_FOR_REP.includes(o.stage));
  const delivered = orders.filter((o) => DONE_FOR_REP.includes(o.stage));
  const proofs = orders.filter((o) => o.stage === "proof_sent");
  const shown = tab === "active" ? active : delivered;
  const first = name.split(" ")[0];

  return (
    <>
      <div>
        <p className="text-[15px] font-semibold text-muted">Hi {first}</p>
        <h1 className="text-[40px] leading-none font-extrabold">Your orders</h1>
      </div>

      <section aria-labelledby="todo-h" className="flex flex-col gap-2.5">
        <h2 id="todo-h" className="text-xl font-bold">
          Waiting on you <span className="font-semibold text-muted">{proofs.length + holds.length}</span>
        </h2>
        {proofs.map((o) => (
          <div key={o.id} className="flex flex-col gap-2.5 rounded-2xl border-2 border-brand bg-white p-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <p className="text-sm font-bold text-brand-text">Proof ready</p>
                <p className="leading-snug font-bold">{o.end_client}</p>
                {o.in_hands_date && (
                  <p className="mt-0.5 text-sm text-muted">Approve soon to keep {shortDay(o.in_hands_date)}.</p>
                )}
              </div>
              <span aria-hidden="true" className="text-[28px] leading-none font-extrabold">{o.number}</span>
            </div>
            <Link
              href={`/rep/orders/${o.number}`}
              className="flex min-h-12 items-center justify-center rounded-xl bg-brand font-bold text-on-brand"
            >
              Review proof
            </Link>
          </div>
        ))}
        {holds.map((h) => (
          <div key={h.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-3.5">
            <p className="text-sm font-bold">Your hold ends at {timeIn(h.expires_at, org.time_zone)}</p>
            <p className="leading-snug font-bold">
              {shortDay(h.in_hands_date)}, {h.pieces} pieces{h.is_rush ? ", rush" : ""}
            </p>
            <p className="text-sm text-muted">
              Email the PO and print-ready art to the shop to lock it in. Uploading here comes in the next version.
            </p>
            <form action={releaseHold}>
              <input type="hidden" name="holdId" value={h.id} />
              <button type="submit" className="min-h-11 text-[15px] font-bold text-brand-text underline">
                Release this hold
              </button>
            </form>
          </div>
        ))}
        {proofs.length + holds.length === 0 && <p className="text-muted">Nothing needs you right now.</p>}
      </section>

      <section aria-labelledby="list-h" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <h2 id="list-h" className="text-xl font-bold">All orders</h2>
          <Link href="/rep/book" className="text-[15px] font-bold text-brand-text underline">Book a new date</Link>
        </div>
        <nav aria-label="Order status" className="grid grid-cols-2 gap-1 rounded-xl bg-hover p-1">
          {(
            [
              ["active", `Active (${active.length})`],
              ["delivered", `Delivered (${delivered.length})`],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={key === "active" ? "/rep" : "/rep?tab=delivered"}
              aria-current={tab === key ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-[9px] text-[15px] font-bold ${
                tab === key ? "bg-ink text-white" : "text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ul className="flex flex-col gap-2.5">
          {shown.map((o) => (
            <li key={o.id}>
              <Link href={`/rep/orders/${o.number}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-3.5 hover:ring-2 hover:ring-ink">
                <span className="flex items-center justify-between gap-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <GarmentChip garment={o.garment_hex} ink={o.ink_hex} label={o.color_label} />
                    <span className="leading-snug font-bold">{o.end_client}</span>
                  </span>
                  <span className="text-2xl leading-none font-extrabold">{o.number}</span>
                </span>
                <span className="text-[15px] font-bold">{REP_STATUS[o.stage]}</span>
                <span aria-hidden="true" className="grid grid-cols-6 gap-[3px]">
                  {[1, 2, 3, 4, 5, 6].map((k) => (
                    <span key={k} className={`h-1.5 rounded-sm ${k <= REP_PROGRESS[o.stage] ? "bg-ink" : "bg-soft"}`} />
                  ))}
                </span>
                {o.in_hands_date && (
                  <span className="text-sm text-muted">
                    {DONE_FOR_REP.includes(o.stage) ? "Delivered for" : "In hand"} {shortDay(o.in_hands_date)}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {shown.length === 0 && <li className="text-muted">No orders here yet.</li>}
        </ul>
      </section>
    </>
  );
}
