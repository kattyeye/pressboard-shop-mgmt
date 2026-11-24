import Link from "next/link";
import { notFound } from "next/navigation";
import { GarmentChip } from "@/components/GarmentChip";
import { requireShop } from "@/lib/dal";
import { shortDay } from "@/lib/dates";
import { sortedSizes } from "@/lib/sizes";
import { NEXT_ACTION, STAGES, STAGE_HINT, STAGE_LABEL } from "@/lib/stages";
import { ORDER_SELECT, type OrderEvent, type OrderItem, type OrderRow } from "@/lib/types";
import { moveStage } from "../../actions";

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { supabase, org } = await requireShop();
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();

  const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("number", n).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as OrderRow;

  const [itemsRes, eventsRes] = await Promise.all([
    supabase.from("order_items").select("id, position, description, decoration, sizes, quantity").eq("order_id", order.id).order("position"),
    supabase.from("order_events").select("id, message, created_at, visible_to_rep").eq("order_id", order.id).order("created_at", { ascending: false }),
  ]);
  const items = (itemsRes.data ?? []) as OrderItem[];
  const events = (eventsRes.data ?? []) as OrderEvent[];
  const current = STAGES.indexOf(order.stage);
  const nextLabel = NEXT_ACTION[order.stage];
  const when = new Intl.DateTimeFormat("en-US", { timeZone: org.time_zone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm font-semibold">
        <Link href="/today#board" className="text-brand-text underline">Orders</Link>
        <span className="text-muted"> / {order.number}</span>
      </p>
      <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <p aria-hidden="true" className="text-[72px] leading-[0.85] font-extrabold tracking-tight sm:text-[88px]">{order.number}</p>
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-bold">
            <span className="sr-only">Order {order.number}, </span>
            {order.end_client}
          </h1>
          <p className="mt-1 text-muted">
            {order.customer?.name}, {order.contact?.full_name}.{order.dealer_po ? ` PO ${order.dealer_po}.` : ""}
            {order.in_hands_date ? ` In hand ${shortDay(order.in_hands_date)}.` : ""}
            {order.is_rush ? " Rush." : ""}
          </p>
        </div>
      </header>

      <nav aria-label="Order progress" className="overflow-x-auto p-0.5">
        <ol className="grid min-w-[1000px] grid-cols-10 gap-1.5">
          {STAGES.map((s, i) => {
            const done = i < current;
            const now = i === current;
            return (
              <li
                key={s}
                aria-current={now ? "step" : undefined}
                className={`flex flex-col gap-1.5 rounded-xl px-2.5 pt-2.5 pb-3 ${
                  now
                    ? "bg-brand-tint text-brand-text ring-2 ring-brand ring-inset"
                    : done
                      ? "bg-white text-ink"
                      : "text-muted ring-1 ring-line ring-inset"
                }`}
              >
                <span
                  className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] font-extrabold ${
                    now ? "bg-brand text-on-brand" : done ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="text-sm leading-tight font-bold">{STAGE_LABEL[s]}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <section aria-labelledby="next-h" className="flex flex-col gap-2.5 rounded-[18px] border-2 border-ink bg-white px-5 py-5">
            <p className="text-sm font-bold text-muted">Now: {STAGE_LABEL[order.stage]}</p>
            <h2 id="next-h" className="text-2xl leading-tight font-bold">{STAGE_HINT[order.stage]}</h2>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {nextLabel && (
                <form action={moveStage}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button type="submit" className="min-h-12 rounded-xl bg-brand px-5 font-bold text-on-brand hover:brightness-95">
                    {nextLabel}
                  </button>
                </form>
              )}
              {current > 0 && (
                <form action={moveStage}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="dir" value="back" />
                  <button type="submit" className="min-h-12 rounded-xl border border-line bg-white px-4 font-bold">
                    Back a step
                  </button>
                </form>
              )}
            </div>
          </section>

          <section aria-labelledby="items-h" className="flex flex-col gap-4 rounded-[18px] border border-line bg-white px-5 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="items-h" className="text-[22px] font-bold">What we’re making</h2>
              <p className="text-sm text-muted">{order.total_pieces} pieces in {items.length} {items.length === 1 ? "line" : "lines"}</p>
            </div>
            {items.map((it, idx) => (
              <div key={it.id} className={`flex flex-col gap-3 ${idx ? "border-t border-line pt-4" : ""}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <GarmentChip garment={order.garment_hex} ink={order.ink_hex} label={order.color_label} size={44} />
                  <div className="flex-[1_1_260px]">
                    <h3 className="text-lg font-bold">{it.description}</h3>
                    {it.decoration && <p className="text-sm text-muted">{it.decoration}</p>}
                  </div>
                  <p className="text-[28px] leading-none font-extrabold">{it.quantity}</p>
                </div>
                <ol aria-label={`Sizes for ${it.description}`} className="flex flex-wrap gap-1.5">
                  {sortedSizes(it.sizes).map(([size, qty]) => (
                    <li key={size} className="flex min-w-16 flex-col items-center rounded-[10px] bg-hover px-2 pt-2 pb-2.5">
                      <span className="text-[13px] font-bold">{size}</span>
                      <span className="text-2xl leading-none font-extrabold">{qty}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <section aria-labelledby="log-h" className="rounded-[18px] border border-line bg-white px-5 py-4">
            <h2 id="log-h" className="mb-2.5 text-xl font-bold">Activity</h2>
            <ol className="flex flex-col gap-2.5">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="w-[104px] shrink-0 font-semibold text-muted">{when.format(new Date(e.created_at))}</span>
                  <span>
                    {e.message}
                    {!e.visible_to_rep && <span className="text-muted"> (shop only)</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
