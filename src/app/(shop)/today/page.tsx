import Link from "next/link";
import { FilterLink } from "@/components/FilterLink";
import { GarmentChip } from "@/components/GarmentChip";
import { requireShop } from "@/lib/dal";
import {
  dayIn,
  dayNum,
  daysBetween,
  dow,
  longDay,
  monthDay,
  shortDay,
  timeIn,
  todayIn,
  workingDaysFrom,
  type ISODate,
} from "@/lib/dates";
import { ACTIVE_STAGES, BOARD_COLUMNS } from "@/lib/stages";
import { ORDER_SELECT, type CapacityDay, type DayStatus, type OrderRow, type SlotHold } from "@/lib/types";
import { moveStage } from "../actions";

const DAY_LOOK: Record<DayStatus, string> = {
  full: "bg-full text-white border-full",
  limited: "bg-soft text-ink border-soft",
  open: "bg-white text-ink border-line",
  closed: "bg-ground text-muted border-line [background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--hover)_6px_12px)]",
};
const DAY_WORD: Record<DayStatus, string> = { full: "Full", limited: "Limited", open: "Open", closed: "Closed" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ dealer?: string }> }) {
  const { supabase, org } = await requireShop();
  const { dealer } = await searchParams;
  const today = todayIn(org.time_zone);
  const horizon = workingDaysFrom(today, 60);
  const strip = horizon.slice(0, 10);

  const [ordersRes, capRes, holdsRes, customersRes, unpaidRes] = await Promise.all([
    supabase.from("orders").select(ORDER_SELECT).in("stage", ACTIVE_STAGES).order("number", { ascending: false }),
    supabase.from("capacity_days").select("day, status, note").gte("day", horizon[0]).lte("day", horizon.at(-1)!),
    supabase
      .from("slot_holds")
      .select("id, in_hands_date, pieces, is_rush, status, expires_at, contact:contacts(full_name, customer:customers(short_name))")
      .eq("status", "held")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at"),
    supabase.from("customers").select("id, short_name").order("name"),
    supabase
      .from("orders")
      .select("id, number, end_client, invoiced_at, customer:customers(short_name)")
      .eq("stage", "invoiced")
      .order("invoiced_at"),
  ]);

  const orders = (ordersRes.data ?? []) as unknown as OrderRow[];
  const capacity = new Map(((capRes.data ?? []) as CapacityDay[]).map((d) => [d.day, d.status]));
  const statusOf = (d: ISODate): DayStatus => capacity.get(d) ?? "open";
  const holds = (holdsRes.data ?? []) as unknown as SlotHold[];
  const customers = (customersRes.data ?? []) as { id: string; short_name: string }[];
  const unpaid = (unpaidRes.data ?? []) as unknown as Pick<OrderRow, "id" | "number" | "end_client" | "invoiced_at" | "customer">[];
  const oldestUnpaid = unpaid[0];
  const oldestSent = oldestUnpaid?.invoiced_at ? dayIn(oldestUnpaid.invoiced_at, org.time_zone) : null;
  const oldestWait = oldestSent ? daysBetween(oldestSent, today) : 0;

  const nextOpen = horizon.find((d) => d > today && statusOf(d) === "open");
  const review = orders.filter((o) => o.stage === "review");
  const proofs = orders.filter((o) => o.stage === "proof_sent");
  const toInvoice = orders.filter((o) => o.stage === "shipped");
  const boardOrders = dealer ? orders.filter((o) => o.customer?.id === dealer) : orders;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[44px] leading-none font-extrabold sm:text-[52px]">{longDay(today)}</h1>
        <p className="mt-2 max-w-[70ch] text-[17px] text-muted">
          {orders.length} orders in the shop.
          {nextOpen ? ` Your next open start is ${shortDay(nextOpen)}.` : " No open days in the next 12 weeks."}
        </p>
      </header>

      <section aria-labelledby="load-h" className="flex flex-col gap-4 rounded-[18px] border border-line bg-white px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="load-h" className="text-[22px] font-bold">Shop load, next 10 working days</h2>
            <p className="text-sm text-muted">Reps see the same days on their booking page, without any customer details.</p>
          </div>
          <Link href="/calendar" className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-4 text-[15px] font-bold text-white">
            Open calendar
          </Link>
        </div>
        <div className="-m-0.5 overflow-x-auto p-1.5">
          <ol className="grid min-w-[860px] grid-cols-10 gap-2">
            {strip.map((d) => {
              const st = statusOf(d);
              const jobs = orders.filter((o) => o.press_date === d).length;
              const isToday = d === today;
              return (
                <li
                  key={d}
                  className={`flex flex-col gap-0.5 rounded-xl border px-2.5 pt-2.5 pb-3 ${DAY_LOOK[st]} ${
                    isToday ? "ring-2 ring-brand ring-offset-2" : ""
                  }`}
                >
                  <span className="text-sm font-bold">{isToday ? "Today" : dow(d)}</span>
                  <span className="text-[34px] leading-none font-extrabold tracking-tight">{dayNum(d)}</span>
                  <span className="text-sm font-bold">{DAY_WORD[st]}</span>
                  <span className="text-xs font-semibold opacity-85">
                    {jobs ? `${jobs} on press` : "Nothing on press"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section aria-labelledby="needs-h" className="rounded-[18px] border border-line bg-white px-5 pt-5 pb-2">
        <h2 id="needs-h" className="mb-1.5 text-[22px] font-bold">Needs you</h2>
        <ul>
          {review.length > 0 && (
            <NeedRow
              flag
              title={`${review.length} work ${review.length === 1 ? "order" : "orders"} to review`}
              detail={review.map((o) => `${o.number} ${o.end_client}`).join(", ")}
              action={<ActionLink href={`/orders/${review[0]!.number}`} primary>Review</ActionLink>}
            />
          )}
          {proofs.length > 0 && (
            <NeedRow
              title={`${proofs.length} ${proofs.length === 1 ? "proof is" : "proofs are"} out with reps`}
              detail={proofs.map((o) => `${o.end_client} (${o.contact?.full_name ?? "rep"})`).join(", ")}
              action={<ActionLink href={`/orders/${proofs[0]!.number}`}>Open</ActionLink>}
            />
          )}
          {toInvoice.map((o) => (
            <NeedRow
              key={o.id}
              title={`Order ${o.number} shipped and is ready to invoice`}
              detail={`${o.end_client} for ${o.customer?.short_name ?? "the dealer"}. QuickBooks connects in milestone 3.`}
              action={
                <form action={moveStage}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <button type="submit" className="min-h-11 rounded-[10px] border border-ink bg-white px-4 text-[15px] font-bold">
                    Mark invoiced
                  </button>
                </form>
              }
            />
          ))}
          {oldestUnpaid && (
            <NeedRow
              flag={oldestWait > 30}
              title={`${unpaid.length} ${unpaid.length === 1 ? "invoice is" : "invoices are"} waiting on payment`}
              detail={`Oldest: ${oldestUnpaid.number} ${oldestUnpaid.end_client} (${oldestUnpaid.customer?.short_name ?? "dealer"})${
                oldestSent ? `, sent ${monthDay(oldestSent, today)}, ${oldestWait} ${oldestWait === 1 ? "day" : "days"} ago` : ""
              }.`}
              action={<ActionLink href="/orders?view=invoiced">See invoices</ActionLink>}
            />
          )}
          {holds.map((h) => (
            <NeedRow
              key={h.id}
              title={`${h.contact?.customer?.short_name ?? "A dealer"} is holding ${shortDay(h.in_hands_date)}`}
              detail={`${h.pieces} pieces${h.is_rush ? ", rush" : ""} for ${h.contact?.full_name ?? "a rep"}. The hold ends ${timeIn(h.expires_at, org.time_zone)} unless the PO and art arrive.`}
              action={<ActionLink href={`/calendar?day=${h.in_hands_date}&month=${h.in_hands_date.slice(0, 7)}`}>See day</ActionLink>}
            />
          ))}
          {review.length + proofs.length + toInvoice.length + unpaid.length + holds.length === 0 && (
            <li className="border-t border-line py-4 text-muted">You’re all caught up.</li>
          )}
        </ul>
      </section>

      <section id="board" aria-labelledby="orders-h" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="orders-h" className="text-[22px] font-bold">Orders</h2>
            <Link href="/orders" className="text-[15px] font-semibold text-brand-text underline">
              Invoiced and paid orders
            </Link>
          </div>
          <nav aria-label="Filter by dealer" className="flex flex-wrap gap-1.5">
            <FilterLink href="/today#board" active={!dealer}>All dealers</FilterLink>
            {customers.map((c) => (
              <FilterLink key={c.id} href={`/today?dealer=${c.id}#board`} active={dealer === c.id}>
                {c.short_name}
              </FilterLink>
            ))}
          </nav>
        </div>
        <div className="overflow-x-auto px-1 pt-1 pb-2.5">
          <div className="grid min-w-[1120px] grid-cols-6 items-start gap-3">
            {BOARD_COLUMNS.map((col) => {
              const cards = boardOrders.filter((o) => col.stages.includes(o.stage));
              return (
                <div key={col.key} className="flex min-h-[200px] flex-col gap-2.5 rounded-[14px] bg-hover p-3">
                  <h3 className="mx-0.5 flex justify-between text-base font-bold">
                    {col.label}
                    <span className="text-muted">{cards.length}</span>
                  </h3>
                  {cards.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.number}`}
                      className="flex flex-col gap-1.5 rounded-[10px] bg-white p-3 text-ink hover:ring-2 hover:ring-ink"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-2xl leading-none font-extrabold tracking-tight">{o.number}</span>
                        <GarmentChip garment={o.garment_hex} ink={o.ink_hex} label={o.color_label} />
                      </span>
                      <span className="text-[15px] leading-snug font-bold">{o.end_client}</span>
                      <span className="text-[13px] text-muted">
                        {o.customer?.short_name}, {o.contact?.full_name}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] font-semibold">
                        <span>{o.total_pieces} pcs</span>
                        {o.in_hands_date && <span>In hand {shortDay(o.in_hands_date)}</span>}
                        {o.is_rush && (
                          <span className="rounded-full bg-warm-tint px-2 font-bold text-warm-text">Rush</span>
                        )}
                      </span>
                    </Link>
                  ))}
                  {cards.length === 0 && <p className="m-1 text-sm text-muted">Nothing here right now.</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function NeedRow({
  title,
  detail,
  action,
  flag = false,
}: {
  title: string;
  detail: string;
  action: React.ReactNode;
  flag?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line py-3.5">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${flag ? "bg-brand" : "bg-muted"}`}
      />
      <div className="min-w-0 flex-[1_1_320px]">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      {action}
    </li>
  );
}

function ActionLink({ href, primary = false, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center rounded-[10px] px-4 text-[15px] font-bold ${
        primary ? "bg-brand text-on-brand hover:brightness-95" : "border border-ink text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
