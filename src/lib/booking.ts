import {
  addDays,
  isWeekday,
  weekStart,
  workingDaysBetween,
  type ISODate,
} from "./dates";
import type { DayStatus, ShopRules } from "./types";

// The shop's rules, applied the same way for every rep.
export type BookingKind = "standard" | "limited" | "rush" | "full" | "closed" | "too_soon" | "past";

export type BookingAnswer = {
  date: ISODate;
  kind: BookingKind;
  rushSpotsLeft?: number;
};

export type BookingInput = {
  today: ISODate;
  pieces: number;
  rules: Pick<
    ShopRules,
    "turnaround_days" | "rush_min_days" | "rush_per_week" | "rush_max_pieces" | "rush_fee_pct"
  >;
  statusOf: (day: ISODate) => DayStatus;
  rushUsedInWeek: (weekStartDay: ISODate) => number;
};

export function evaluate(date: ISODate, input: BookingInput): BookingAnswer {
  const { today, pieces, rules, statusOf, rushUsedInWeek } = input;
  if (date <= today) return { date, kind: "past" };
  if (!isWeekday(date)) return { date, kind: "closed" };
  const status = statusOf(date);
  if (status === "closed") return { date, kind: "closed" };
  if (status === "full") return { date, kind: "full" };

  const lead = workingDaysBetween(today, date);
  if (lead >= rules.turnaround_days) {
    return { date, kind: status === "limited" ? "limited" : "standard" };
  }

  const left = rules.rush_per_week - rushUsedInWeek(weekStart(date));
  if (lead >= rules.rush_min_days && pieces <= rules.rush_max_pieces && left > 0) {
    return { date, kind: "rush", rushSpotsLeft: left };
  }
  return { date, kind: "too_soon" };
}

/** Earliest date (within ~10 weeks) whose answer is one of `kinds`. */
export function earliest(
  kinds: BookingKind[],
  input: BookingInput,
): BookingAnswer | null {
  let d = addDays(input.today, 1);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {
    const a = evaluate(d, input);
    if (kinds.includes(a.kind)) return a;
  }
  return null;
}

export const BOOKABLE: BookingKind[] = ["standard", "limited", "rush"];
