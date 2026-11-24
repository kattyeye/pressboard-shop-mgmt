import "server-only";
import { requireRep } from "./dal";
import { todayIn, weekStart, workingDaysFrom, type ISODate } from "./dates";
import type { BookingInput } from "./booking";
import type { CapacityDay, DayStatus } from "./types";

/** Everything the booking rules need, loaded fresh for the signed-in rep. */
export async function loadBookingInput(pieces: number) {
  const ctx = await requireRep();
  const { supabase, org, rules } = ctx;
  const today = todayIn(org.time_zone);
  const days = workingDaysFrom(today, 45);

  const { data: cap } = await supabase
    .from("capacity_days")
    .select("day, status, note")
    .gte("day", days[0])
    .lte("day", days.at(-1)!);
  const capacity = new Map(((cap ?? []) as CapacityDay[]).map((d) => [d.day, d.status]));

  const weeks = [...new Set(days.map(weekStart))];
  const counts = await Promise.all(
    weeks.map((w) => supabase.rpc("rush_spots_used", { org: org.id, week_start: w })),
  );
  const rushUsed = new Map<ISODate, number>(weeks.map((w, i) => [w, Number(counts[i]!.data ?? 0)]));

  const input: BookingInput = {
    today,
    pieces,
    rules,
    statusOf: (d) => capacity.get(d) ?? ("open" as DayStatus),
    rushUsedInWeek: (w) => rushUsed.get(w) ?? 0,
  };
  return { ctx, input, days, capacity: Object.fromEntries(capacity), rushUsed: Object.fromEntries(rushUsed) };
}
