import Link from "next/link";
import { FilterLink } from "@/components/FilterLink";
import { GarmentChip } from "@/components/GarmentChip";
import { requireShop } from "@/lib/dal";
import { dayIn, daysBetween, monthDay, monthTitle, todayIn, type ISODate } from "@/lib/dates";
import { ACTIVE_STAGES, STAGE_LABEL, type Stage } from "@/lib/stages";
import { ORDER_SELECT, type OrderRow } from "@/lib/types";

const LIMIT = 200;

const VIEWS = {
  all: { label: "All", stages: null },
  active: { label: "In the shop", stages: ACTIVE_STAGES },
  invoiced: { label: "Waiting on payment", stages: ["invoiced"] as Stage[] },
  paid: { label: "Paid", stages: ["paid"] as Stage[] },
} as const;
type ViewKey = keyof typeof VIEWS;
const VIEW_KEYS = Object.keys(VIEWS) as ViewKey[];

const BADGE: Record<Stage, string> = {
  review: "bg-brand-tint text-brand-text",
  proof_sent: "bg-brand-tint text-brand-text",
  approved: "bg-brand-tint text-brand-text",
  scheduled: "bg-brand-tint text-brand-text",
  on_press: "bg-brand-tint text-brand-text",
  finishing: "bg-brand-tint text-brand-text",
  packed: "bg-brand-tint text-brand-text",
  shipped: "bg-brand-tint text-brand-text",
  invoiced: "bg-highlight text-ink",
  paid: "bg-hover text-ink",
};

/** Over this many days, an unpaid invoice is shown as late. */
const LATE_DAYS = 30;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; dealer?: string; q?: string }>;
}) {
  const { supabase, org } = await requireShop();
  const sp = await searchParams;
  const view: ViewKey = VIEW_KEYS.includes(sp.view as ViewKey) ? (sp.view as ViewKey) : "all";
  const dealer = /^[0-9a-f-]{36}$/i.test(sp.dealer ?? "") ? sp.dealer! : undefined;
  // Letters, digits and a few safe marks only: the term goes into a filter string.
  const term = (sp.q ?? "").replace(/[^\p{L}\p{N} '&.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const today = todayIn(org.time_zone);

  const href = (next: { view?: ViewKey; dealer?: string | null; q?: string | null }) => {
    const p = new URLSearchParams();
    const v = next.view ?? view;
    const d = next.dealer === null ? undefined : (next.dealer ?? dealer);
    const q = next.q === null ? undefined : (next.q ?? term);
    if (v !== "all") p.set("view", v);
    if (d) p.set("dealer", d);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  // Same dealer and search filters for the list and for each tab's count
  const filtered = (select: string, head = false) => {
    let q = supabase.from("orders").select(select, head ? { count: "exact", head: true } : undefined);
    if (dealer) q = q.eq("customer_id", dealer);
    if (term) {
      q = /^\d+$/.test(term)
        ? q.eq("number", Number(term))
        : q.or(`end_client.ilike."%${term}%",dealer_po.ilike."%${term}%"`);
    }
    return q;
  };

  let list = filtered(ORDER_SELECT);
  const stages = VIEWS[view].stages;
  if (stages) list = list.in("stage", stages);
  list =
    view === "paid"
      ? list.order("paid_at", { ascending: false })
      : view === "invoiced"
        ? list.order("invoiced_at", { ascending: true })
        : list.order("number", { ascending: false });

  const [listRes, customersRes, ...countRes] = await Promise.all([
    list.limit(LIMIT),
    supabase.from("customers").select("id, short_name").order("name"),
    ...VIEW_KEYS.map((k) => {
      const q = filtered("id", true);
      const st = VIEWS[k].stages;
      return st ? q.in("stage", st) : q;
    }),
  ]);
  const orders = (listRes.data ?? []) as unknown as OrderRow[];
  const customers = (customersRes.data ?? []) as { id: string; short_name: string }[];
  const counts = Object.fromEntries(VIEW_KEYS.map((k, i) => [k, countRes[i]?.count ?? 0])) as Record<ViewKey, number>;

  const local = (iso: string | null) => (iso ? dayIn(iso, org.time_zone) : null);
  const pieces = (rows: OrderRow[]) => rows.reduce((n, o) => n + o.total_pieces, 0);

  // Paid orders are grouped by the month they were paid; everything else is one list
  const groups: { key: string; title: string | null; rows: OrderRow[] }[] = [];
  if (view === "paid") {
    for (const o of orders) {
      const month = (local(o.paid_at) ?? today).slice(0, 7);
      const last = groups.at(-1);
      if (last?.key === month) last.rows.push(o);
      else groups.push({ key: month, title: monthTitle(`${month}-01`), rows: [o] });
    }
  } else if (orders.length) {
    groups.push({ key: "all", title: null, rows: orders });
  }

  const oldestSent = view === "invoiced" ? local(orders[0]?.invoiced_at ?? null) : null;
  const summary =
    view === "invoiced"
      ? orders.length
        ? `${plural(orders.length, "invoice")} waiting on payment, ${pieces(orders)} pieces. The oldest was sent ${monthDay(oldestSent!, today)}, ${plural(daysBetween(oldestSent!, today), "day")} ago.`
        : "Every invoice has been paid."
      : view === "paid"
        ? `${plural(orders.length, "order")} paid, ${pieces(orders)} pieces. Newest first, by the month the payment came in.`
        : view === "active"
          ? `${plural(orders.length, "order")} in the shop, from review to shipped.`
          : `${plural(orders.length, "order")}, newest first.`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[48px] leading-none font-extrabold">Orders</h1>
        <p className="mt-2 max-w-[70ch] text-[17px] text-muted">
          Every order, from the first proof to paid. Nothing is deleted, so past seasons stay here to look back on.
        </p>
      </header>

      <section aria-label="Find orders" className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-white p-4">
        <nav aria-label="Order views" className="flex flex-wrap gap-1 rounded-xl bg-hover p-1">
          {VIEW_KEYS.map((k) => (
            <Link
              key={k}
              href={href({ view: k })}
              aria-current={view === k ? "page" : undefined}
              className={`inline-flex min-h-11 flex-auto items-center justify-center gap-2 rounded-[9px] px-3 text-[15px] font-bold whitespace-nowrap ${
                view === k ? "bg-ink text-white" : "text-ink hover:bg-white"
              }`}
            >
              {VIEWS[k].label}
              <span className={`rounded-full px-2 text-[13px] ${view === k ? "bg-white/20" : "bg-white"}`}>{counts[k]}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <form role="search" action="/orders" className="flex flex-[1_1_320px] gap-2">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            {dealer && <input type="hidden" name="dealer" value={dealer} />}
            <label htmlFor="order-search" className="sr-only">Search orders</label>
            <input
              id="order-search"
              name="q"
              type="search"
              defaultValue={term}
              placeholder="Order number, team or PO"
              className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3.5"
            />
            <button type="submit" className="min-h-11 rounded-[10px] bg-ink px-4 text-[15px] font-bold text-white">
              Search
            </button>
          </form>
          <nav aria-label="Filter by dealer" className="flex flex-wrap gap-1.5">
            <FilterLink href={href({ dealer: null })} active={!dealer}>All dealers</FilterLink>
            {customers.map((c) => (
              <FilterLink key={c.id} href={href({ dealer: c.id })} active={dealer === c.id}>
                {c.short_name}
              </FilterLink>
            ))}
          </nav>
        </div>
      </section>

      <section aria-labelledby="list-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="list-h" className="text-[22px] font-bold">
            {VIEWS[view].label}
            {term ? <span className="font-semibold text-muted"> matching “{term}”</span> : null}
          </h2>
          {term && (
            <Link href={href({ q: null })} className="text-[15px] font-semibold text-brand-text underline">
              Clear search
            </Link>
          )}
        </div>
        <p className="-mt-2 text-[15px] text-muted">{summary}</p>

        {groups.length === 0 ? (
          <p className="rounded-[18px] border border-line bg-white px-5 py-8 text-center text-muted">
            No orders here{term || dealer ? " with these filters" : " yet"}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[18px] border border-line bg-white">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="text-[13px] text-muted">
                  <th scope="col" className="px-4 pt-3.5 pb-2.5 font-bold">Order</th>
                  <th scope="col" className="px-3 pt-3.5 pb-2.5 font-bold">Team</th>
                  <th scope="col" className="px-3 pt-3.5 pb-2.5 font-bold">Dealer</th>
                  <th scope="col" className="px-3 pt-3.5 pb-2.5 text-right font-bold">Pieces</th>
                  <th scope="col" className="px-3 pt-3.5 pb-2.5 font-bold">Status</th>
                  <th scope="col" className="px-4 pt-3.5 pb-2.5 font-bold">When</th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.key}>
                  {g.title && (
                    <tr>
                      <th scope="rowgroup" colSpan={6} className="border-t border-line bg-ground px-4 py-2.5 text-left">
                        <span className="text-base font-bold">{g.title}</span>
                        <span className="text-sm font-semibold text-muted">
                          {" "}
                          · {plural(g.rows.length, "order")}, {pieces(g.rows)} pieces
                        </span>
                      </th>
                    </tr>
                  )}
                  {g.rows.map((o) => (
                    <tr key={o.id} className="border-t border-line align-top hover:bg-ground/60">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.number}`} className="text-xl leading-none font-extrabold tracking-tight underline-offset-4 hover:underline">
                          {o.number}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2.5">
                          <GarmentChip garment={o.garment_hex} ink={o.ink_hex} label={o.color_label} />
                          <span className="font-bold">{o.end_client}</span>
                          {o.is_rush && <span className="rounded-full bg-warm-tint px-2 text-[13px] font-bold text-warm-text">Rush</span>}
                        </span>
                        {o.dealer_po && <span className="mt-0.5 block text-[13px] text-muted">PO {o.dealer_po}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-semibold">{o.customer?.short_name}</span>
                        <span className="block text-[13px] text-muted">{o.contact?.full_name}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{o.total_pieces}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap ${BADGE[o.stage]}`}>
                          {STAGE_LABEL[o.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[15px]">
                        <When order={o} today={today} local={local} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
        {orders.length === LIMIT && (
          <p className="text-sm text-muted">Showing the first {LIMIT}. Search by team or order number to find older orders.</p>
        )}
      </section>
    </div>
  );
}

/** The date that matters for where the order is now. */
function When({ order: o, today, local }: { order: OrderRow; today: ISODate; local: (iso: string | null) => ISODate | null }) {
  const paid = local(o.paid_at);
  const invoiced = local(o.invoiced_at);
  const shipped = local(o.shipped_at);
  if (o.stage === "paid" && paid) {
    return (
      <>
        <span className="block font-semibold">Paid {monthDay(paid, today)}</span>
        {invoiced && (
          <span className="block text-[13px] text-muted">
            {daysBetween(invoiced, paid) === 0
              ? "The same day as the invoice"
              : `${plural(daysBetween(invoiced, paid), "day")} after the invoice`}
          </span>
        )}
      </>
    );
  }
  if (o.stage === "invoiced" && invoiced) {
    const wait = daysBetween(invoiced, today);
    return (
      <>
        <span className="block font-semibold">Invoiced {monthDay(invoiced, today)}</span>
        <span
          className={`mt-0.5 inline-block rounded-full text-[13px] font-bold ${
            wait > LATE_DAYS ? "-mx-2 bg-warm-tint px-2 text-warm-text" : "text-muted"
          }`}
        >
          Waiting {plural(wait, "day")}
        </span>
      </>
    );
  }
  if (o.stage === "shipped" && shipped) {
    return <span className="block font-semibold">Shipped {monthDay(shipped, today)}</span>;
  }
  return o.in_hands_date ? (
    <span className="block font-semibold">In hand {monthDay(o.in_hands_date, today)}</span>
  ) : (
    <span className="text-muted">No date yet</span>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
