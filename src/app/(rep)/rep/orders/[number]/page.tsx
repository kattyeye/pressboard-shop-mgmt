import Link from "next/link";
import { notFound } from "next/navigation";
import { GarmentChip } from "@/components/GarmentChip";
import { requireRep } from "@/lib/dal";
import { shortDay } from "@/lib/dates";
import { REP_PROGRESS, REP_STATUS } from "@/lib/stages";
import { ORDER_SELECT, type OrderEvent, type OrderItem, type OrderRow } from "@/lib/types";
import { approveProof, requestChanges } from "../../../actions";

const STEPS = ["Received", "Proof", "Scheduled", "In production", "Packed", "Shipped"];

export default async function RepOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { supabase, org } = await requireRep();
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();

  // Row level security only returns this rep's own orders.
  const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("number", n).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as OrderRow;

  const [itemsRes, eventsRes] = await Promise.all([
    supabase.from("order_items").select("id, position, description, decoration, sizes, quantity").eq("order_id", order.id).order("position"),
    supabase.from("order_events").select("id, message, created_at, visible_to_rep").eq("order_id", order.id).order("created_at", { ascending: false }),
  ]);
  const items = (itemsRes.data ?? []) as OrderItem[];
  const events = (eventsRes.data ?? []) as OrderEvent[];
  const progress = REP_PROGRESS[order.stage];
  const when = new Intl.DateTimeFormat("en-US", { timeZone: org.time_zone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <p className="text-[15px] font-semibold">
        <Link href="/rep" className="text-brand-text underline">My orders</Link>
        <span className="text-muted"> / Order {order.number}</span>
      </p>
      <div className="flex items-center gap-3">
        <GarmentChip garment={order.garment_hex} ink={order.ink_hex} label={order.color_label} size={44} />
        <h1 className="text-[34px] leading-none font-extrabold">{order.end_client}</h1>
      </div>
      <p className="text-[15px] text-muted">
        {order.total_pieces} pieces{order.dealer_po ? `, PO ${order.dealer_po}` : ""}
        {order.in_hands_date ? `, in hand ${shortDay(order.in_hands_date)}` : ""}.
      </p>

      <section aria-labelledby="status-h" className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
        <h2 id="status-h" className="text-xl font-bold">{REP_STATUS[order.stage]}</h2>
        <ol className="grid grid-cols-3 gap-1.5">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i + 1 === progress ? "step" : undefined}
              className={`rounded-[10px] px-2 py-2 text-center text-[13px] font-bold ${
                i + 1 < progress ? "bg-ink text-white" : i + 1 === progress ? "bg-brand text-on-brand" : "bg-hover text-muted"
              }`}
            >
              {s}
            </li>
          ))}
        </ol>
      </section>

      {order.stage === "proof_sent" && (
        <section aria-labelledby="proof-h" className="flex flex-col gap-3 rounded-[18px] border-2 border-brand bg-white p-4">
          <h2 id="proof-h" className="text-xl font-bold">Your proof is ready</h2>
          <p className="text-[15px]">
            Check spelling, colors, sizes and placement. After you approve, the shop prints exactly what’s shown.
            The mockup image arrives in the next version; for now the proof comes by email.
          </p>
          <form action={approveProof}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="number" value={order.number} />
            <button type="submit" className="min-h-[52px] w-full rounded-xl bg-brand font-bold text-on-brand">
              Approve proof
            </button>
          </form>
          <form action={requestChanges} className="flex flex-col gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="number" value={order.number} />
            <label htmlFor="note" className="text-sm font-bold">Or describe a change</label>
            <textarea id="note" name="note" rows={3} required maxLength={500} placeholder="Example: make the logo 1 inch bigger" className="rounded-xl border border-line px-3 py-2" />
            <button type="submit" className="min-h-12 rounded-xl border border-ink bg-white font-bold">Send change request</button>
          </form>
        </section>
      )}

      <section aria-labelledby="items-h" className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
        <h2 id="items-h" className="text-lg font-bold">What’s being made</h2>
        {items.map((it) => (
          <div key={it.id} className="flex flex-col gap-2">
            <p className="font-bold">
              {it.description} <span className="text-muted">({it.quantity})</span>
            </p>
            {it.decoration && <p className="text-sm text-muted">{it.decoration}</p>}
            <ol aria-label={`Sizes for ${it.description}`} className="flex flex-wrap gap-1">
              {Object.entries(it.sizes).map(([size, qty]) => (
                <li key={size} className="flex min-w-12 flex-col items-center rounded-lg bg-hover px-1.5 py-1.5">
                  <span className="text-xs font-bold">{size}</span>
                  <span className="text-lg leading-none font-extrabold">{qty}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section aria-labelledby="hist-h" className="rounded-[18px] border border-line bg-white p-4">
        <h2 id="hist-h" className="mb-2 text-lg font-bold">History</h2>
        <ol className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 text-sm">
              <span className="w-[96px] shrink-0 font-semibold text-muted">{when.format(new Date(e.created_at))}</span>
              <span>{e.message}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
