"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BOOKABLE, earliest, evaluate, type BookingInput, type BookingKind } from "@/lib/booking";
import { addDays, dayNum, isWeekday, shortDay, weekStart, type ISODate } from "@/lib/dates";
import type { DayStatus } from "@/lib/types";
import { createHold, type HoldResult } from "../../actions";

type Rules = BookingInput["rules"] & { hold_hours: number };

const CELL: Record<BookingKind, string> = {
  full: "bg-full text-white",
  too_soon: "bg-full text-white",
  rush: "bg-warm-tint text-warm-text",
  limited: "bg-soft text-ink",
  standard: "bg-white text-ink border border-line",
  closed: "bg-ground text-muted border border-line [background-image:repeating-linear-gradient(135deg,transparent_0_5px,var(--hover)_5px_10px)]",
  past: "bg-transparent text-muted opacity-60",
};
const WORD: Record<BookingKind, string> = {
  full: "Full",
  too_soon: "Full",
  rush: "Rush",
  limited: "Limited",
  standard: "Open",
  closed: "Closed",
  past: "Past",
};

export function BookingClient({
  today,
  capacity,
  rushUsed,
  rules,
}: {
  today: ISODate;
  capacity: Record<string, DayStatus>;
  rushUsed: Record<string, number>;
  rules: Rules;
}) {
  const [pieces, setPieces] = useState(48);
  const [decoration, setDecoration] = useState("Vinyl");
  const [selected, setSelected] = useState<ISODate | null>(null);
  const [result, setResult] = useState<HoldResult | null>(null);
  const [pending, startTransition] = useTransition();

  const input: BookingInput = useMemo(
    () => ({
      today,
      pieces,
      rules,
      statusOf: (d) => capacity[d] ?? "open",
      rushUsedInWeek: (w) => rushUsed[w] ?? 0,
    }),
    [today, pieces, rules, capacity, rushUsed],
  );

  // Four weeks of weekdays, starting with the week after today
  const days = useMemo(() => {
    const out: ISODate[] = [];
    let d = weekStart(addDays(today, 1));
    while (out.length < 20) {
      if (isWeekday(d)) out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [today]);

  const answer = selected ? evaluate(selected, input) : null;
  const firstRush = earliest(["rush"], input);
  const firstStandard = earliest(["standard", "limited"], input);

  function hold() {
    if (!selected) return;
    startTransition(async () => setResult(await createHold(selected, pieces, decoration)));
  }

  if (result?.ok) {
    return (
      <section role="status" className="flex flex-col gap-2.5 rounded-[18px] bg-ink p-4 text-white">
        <p className="text-sm font-bold text-white/85">Held for you</p>
        <h2 className="text-2xl font-bold">
          {shortDay(result.date)}, {pieces} pieces{result.rush ? " (rush)" : ""}
        </h2>
        <p className="text-[15px]">
          The hold lasts {rules.hold_hours} hours. Email the PO and print-ready art to the shop to lock it in.
        </p>
        <Link href="/rep" className="mt-1 flex min-h-12 items-center justify-center rounded-xl bg-white font-bold text-ink">
          See it in My orders
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <div role="group" aria-labelledby="qty-l" className="flex-[1_1_150px] rounded-[14px] border border-line bg-white px-3 py-2.5">
          <p id="qty-l" className="mb-1 text-sm font-bold">Pieces</p>
          <div className="flex items-center justify-between gap-1.5">
            <button type="button" aria-label="12 fewer pieces" onClick={() => setPieces((p) => Math.max(12, p - 12))} className="h-11 w-11 rounded-[10px] border border-line text-xl font-bold">−</button>
            <output aria-live="polite" className="text-[30px] leading-none font-extrabold">{pieces}</output>
            <button type="button" aria-label="12 more pieces" onClick={() => setPieces((p) => Math.min(1200, p + 12))} className="h-11 w-11 rounded-[10px] border border-line text-xl font-bold">+</button>
          </div>
        </div>
        <div role="radiogroup" aria-labelledby="dec-l" className="flex-[1_1_170px] rounded-[14px] border border-line bg-white px-3 py-2.5">
          <p id="dec-l" className="mb-1 text-sm font-bold">Decoration</p>
          <div className="flex gap-1 rounded-[10px] bg-hover p-[3px]">
            {["Vinyl", "DTF", "Decals"].map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={decoration === d}
                onClick={() => setDecoration(d)}
                className={`min-h-10 flex-1 rounded-lg text-sm font-bold ${decoration === d ? "bg-ink text-white" : "text-ink"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section aria-label="Pick an in-hand date" className="rounded-[18px] border border-line bg-white px-3 pt-3.5 pb-3">
        <div aria-hidden="true" className="mb-1.5 grid grid-cols-5 gap-1.5 text-center text-[13px] font-bold text-muted">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {days.map((d) => {
            const a = evaluate(d, input);
            const on = d === selected;
            return (
              <button
                key={d}
                type="button"
                disabled={a.kind === "past"}
                onClick={() => {
                  setSelected(d);
                  setResult(null);
                }}
                aria-pressed={on}
                aria-label={`${shortDay(d)}, ${WORD[a.kind]}`}
                className={`flex min-h-14 flex-col items-center justify-center rounded-[10px] py-1 ${CELL[a.kind]} ${
                  on ? "ring-2 ring-brand ring-offset-2" : ""
                }`}
              >
                <span className="text-xl leading-none font-extrabold">{dayNum(d)}</span>
                <span className="text-[11.5px] font-bold">{WORD[a.kind]}</span>
              </button>
            );
          })}
        </div>
        <p className="mx-1 mt-2.5 text-[13px] text-muted">
          Open is the standard price. Rush adds {rules.rush_fee_pct}%. Full means the shop can’t make that date.
        </p>
      </section>

      {!answer && <p className="text-[15px] text-muted">Tap a day to see if it works.</p>}

      {answer && (
        <section aria-live="polite" className={`flex flex-col gap-2.5 rounded-[18px] border-2 bg-white p-4 ${BOOKABLE.includes(answer.kind) ? "border-brand" : "border-ink"}`}>
          {answer.kind === "standard" && (
            <Answer kicker="Standard price" title={`${shortDay(answer.date)} works`} body="Approve the proof 2 working days before press day and it arrives on time." />
          )}
          {answer.kind === "limited" && (
            <Answer kicker="Limited" title={`${shortDay(answer.date)} is tight but possible`} body="The shop confirms limited days within a few hours." />
          )}
          {answer.kind === "rush" && (
            <Answer
              kicker={`Rush, +${rules.rush_fee_pct}%`}
              title={`${shortDay(answer.date)} is possible as a rush`}
              body={`${answer.rushSpotsLeft} of ${rules.rush_per_week} rush spots left that week. The PO and art are needed by 10 AM the next working day.`}
            />
          )}
          {(answer.kind === "full" || answer.kind === "too_soon") && (
            <Answer
              kicker="Full"
              title={`${shortDay(answer.date)} doesn't work`}
              body={
                pieces > rules.rush_max_pieces
                  ? `Rush is for orders up to ${rules.rush_max_pieces} pieces. Here's the soonest standard date.`
                  : `Here's the soonest the shop can get ${pieces} pieces to you.`
              }
            />
          )}
          {answer.kind === "closed" && <Answer kicker="Closed" title="The shop is closed that day" body="Pick another day." />}

          {BOOKABLE.includes(answer.kind) ? (
            <button
              type="button"
              onClick={hold}
              disabled={pending}
              className="min-h-[50px] rounded-xl bg-brand font-bold text-on-brand disabled:opacity-60"
            >
              {pending ? "Holding…" : answer.kind === "rush" ? "Hold this rush spot" : "Hold this day"}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {pieces <= rules.rush_max_pieces && firstRush && (
                <button type="button" onClick={() => setSelected(firstRush.date)} className="min-h-12 rounded-xl border border-ink bg-white font-bold">
                  Pick {shortDay(firstRush.date)} (rush)
                </button>
              )}
              {firstStandard && (
                <button type="button" onClick={() => setSelected(firstStandard.date)} className="min-h-12 rounded-xl border border-ink bg-white font-bold">
                  Pick {shortDay(firstStandard.date)} (standard)
                </button>
              )}
            </div>
          )}
          {result && !result.ok && (
            <p role="alert" className="rounded-xl bg-warm-tint px-3 py-2 text-sm font-semibold text-warm-text">{result.message}</p>
          )}
        </section>
      )}
    </div>
  );
}

function Answer({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <>
      <p className="text-sm font-bold">{kicker}</p>
      <h2 className="text-2xl leading-tight font-bold">{title}</h2>
      <p className="text-[15px]">{body}</p>
    </>
  );
}
