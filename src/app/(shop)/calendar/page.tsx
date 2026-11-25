import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireShop } from "@/lib/dal";
import {
  addDays,
  dayNum,
  isWeekday,
  longDay,
  monthBounds,
  monthTitle,
  shiftMonth,
  todayIn,
  weekStart,
  type ISODate,
} from "@/lib/dates";
import type { CapacityDay, DayStatus, OrderRow, SlotHold } from "@/lib/types";
import { setDayStatus } from "../actions";

const LOOK: Record<DayStatus, string> = {
  full: "bg-full text-white border-full",
  limited: "bg-soft text-ink border-soft",
  open: "bg-white text-ink border-line",
  closed: "bg-ground text-muted border-line [background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--hover)_6px_12px)]",
};
const WORD: Record<DayStatus, string> = { open: "Open", limited: "Limited", full: "Full", closed: "Closed" };
const REP_SEES: Record<DayStatus, string> = {
  open: "Reps can book this day at the standard price.",
  limited: 'Reps see "Limited" and can still book it. You confirm each one.',
  full: 'Reps see "Full" and are shown the next day that works.',
  closed: "Reps see the shop as closed.",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const { supabase, org, rules, membership } = await requireShop();
  const sp = await searchParams;
  const today = todayIn(org.time_zone);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const { first, last } = monthBounds(month);
  const gridStart = weekStart(first);

  const [capRes, ordersRes, holdsRes] = await Promise.all([
    supabase.from("capacity_days").select("day, status, note").gte("day", gridStart).lte("day", addDays(last, 7)),
    supabase
      .from("orders")
      .select("id, number, end_client, press_date, garment_hex, ink_hex, color_label, stage")
      .gte("press_date", gridStart)
      .lte("press_date", addDays(last, 7)),
    supabase
      .from("slot_holds")
      .select("id, in_hands_date, pieces, is_rush, status, expires_at, contact:contacts(full_name, customer:customers(short_name))")
      .eq("status", "held")
      .gt("expires_at", new Date().toISOString()),
  ]);
  const cap = new Map(((capRes.data ?? []) as CapacityDay[]).map((d) => [d.day, d]));
  const statusOf = (d: ISODate): DayStatus => cap.get(d)?.status ?? "open";
  const orders = (ordersRes.data ?? []) as unknown as Pick<OrderRow, "id" | "number" | "end_client" | "press_date" | "garment_hex" | "ink_hex" | "color_label" | "stage">[];
  const holds = (holdsRes.data ?? []) as unknown as SlotHold[];

  // Weekday grid covering the whole month
  const days: ISODate[] = [];
  for (let d = gridStart; d <= last || days.length % 5 !== 0; d = addDays(d, 1)) {
    if (isWeekday(d)) days.push(d);
  }

  const selected =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && isWeekday(sp.day) ? sp.day : days.find((d) => d >= today && d.startsWith(month)) ?? days[0]!;
  const selStatus = statusOf(selected);
  const selOrders = orders.filter((o) => o.press_date === selected);
  const selHolds = holds.filter((h) => h.in_hands_date === selected);
  const isOwner = membership.role === "owner";
  const isPast = selected < today;
  const href = (m: string, d?: string) => `/calendar?month=${m}${d ? `&day=${d}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[70ch]">
          <h1 className="text-[48px] leading-none font-extrabold">{monthTitle(first)}</h1>
          <p className="mt-2 text-[17px] text-muted">
            Pick a day to change it. Reps see your change on their booking page right away.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={href(shiftMonth(month, -1))} aria-label="Previous month" className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white">
            <Icon name="left" size={18} />
          </Link>
          <Link href={href(shiftMonth(month, 1))} aria-label="Next month" className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white">
            <Icon name="right" size={18} />
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label={`${monthTitle(first)}, weekdays`} className="min-w-0 flex-[999_1_600px] rounded-[18px] border border-line bg-white p-4">
          <div className="-m-1.5 overflow-x-auto p-1.5">
            <div className="min-w-[620px]">
              <div aria-hidden="true" className="mb-2 grid grid-cols-5 gap-2 text-[15px] font-bold text-muted">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                  <span key={d} className="pl-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {days.map((d) => {
                  const st = statusOf(d);
                  const jobs = orders.filter((o) => o.press_date === d).length;
                  const held = holds.filter((h) => h.in_hands_date === d).length;
                  const inMonth = d.startsWith(month);
                  return (
                    <Link
                      key={d}
                      href={href(month, d)}
                      aria-current={d === selected ? "date" : undefined}
                      aria-label={`${longDay(d)}, ${WORD[st]}`}
                      className={`flex min-h-[110px] flex-col gap-0.5 rounded-xl border px-2.5 pt-2.5 pb-3 ${LOOK[st]} ${
                        d < today || !inMonth ? "opacity-55" : ""
                      } ${d === selected ? "ring-[3px] ring-brand ring-inset" : ""}`}
                    >
                      <span className="flex items-baseline justify-between">
                        <span className="text-[30px] leading-none font-extrabold tracking-tight">{dayNum(d)}</span>
                        {d === today && <span className="text-[13px] font-bold">Today</span>}
                      </span>
                      <span className="text-sm font-bold">{WORD[st]}</span>
                      <span className="mt-auto text-xs font-semibold opacity-85">
                        {jobs ? `${jobs} on press` : ""}
                        {jobs && held ? ", " : ""}
                        {held ? `${held} ${held === 1 ? "hold" : "holds"}` : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mx-1 mt-3.5 text-sm text-muted">Weekends are closed.</p>
        </section>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <section aria-labelledby="day-h" className="flex flex-col gap-3.5 rounded-[18px] border-2 border-ink bg-white px-5 py-4">
            <div>
              <h2 id="day-h" className="text-2xl font-bold">{longDay(selected)}</h2>
              <p className="text-sm text-muted">{isPast ? "This day has passed." : WORD[selStatus]}</p>
            </div>
            {isOwner && !isPast ? (
              <div role="group" aria-label="Day status" className="grid grid-cols-4 gap-1 rounded-xl bg-hover p-1">
                {(["open", "limited", "full", "closed"] as DayStatus[]).map((s) => (
                  <form key={s} action={setDayStatus}>
                    <input type="hidden" name="day" value={selected} />
                    <input type="hidden" name="status" value={s} />
                    <button
                      type="submit"
                      aria-pressed={selStatus === s}
                      className={`min-h-11 w-full rounded-[9px] text-[15px] font-bold ${
                        selStatus === s ? "bg-ink text-white" : "text-ink"
                      }`}
                    >
                      {WORD[s]}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              !isPast && <p className="text-sm text-muted">Only an owner can change a day.</p>
            )}
            <p className="text-sm font-semibold">{REP_SEES[selStatus]}</p>
            <div>
              <h3 className="mb-1.5 text-[15px] font-bold">On press</h3>
              {selOrders.length === 0 && <p className="text-sm text-muted">Nothing booked yet.</p>}
              <ul className="flex flex-col gap-1.5">
                {selOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.number}`} className="flex items-center gap-2.5 text-[15px] hover:underline">
                      <span className="text-lg font-extrabold">{o.number}</span>
                      <span>{o.end_client}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {selHolds.map((h) => (
                <p key={h.id} className="mt-2 rounded-[10px] bg-hover px-2.5 py-2 text-sm">
                  Held for {h.contact?.customer?.short_name}, {h.contact?.full_name}: {h.pieces} pieces
                  {h.is_rush ? ", rush" : ""}. Waiting on the PO and art.
                </p>
              ))}
            </div>
          </section>

          <section aria-labelledby="rules-h" className="rounded-[18px] border border-line bg-white px-5 py-4">
            <h2 id="rules-h" className="text-xl font-bold">Rules reps see</h2>
            <p className="mb-2.5 text-sm text-muted">The booking page applies these the same way every time.</p>
            <dl className="flex flex-col">
              {[
                ["Standard turnaround", `${rules.turnaround_days} working days`],
                ["Rush fee", `+${rules.rush_fee_pct}%`],
                ["Rush jobs per week", `${rules.rush_per_week} at most`],
                ["Fastest rush", `${rules.rush_min_days} working days`],
                ["Biggest rush order", `${rules.rush_max_pieces} pieces`],
                ["Slot holds last", `${rules.hold_hours} hours`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-t border-line py-2.5">
                  <dt className="font-semibold">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
