import { loadBookingInput } from "@/lib/rep-booking";
import { BookingClient } from "./BookingClient";

export default async function BookPage() {
  const { ctx, input, capacity, rushUsed } = await loadBookingInput(48);
  const first = ctx.name.split(" ")[0];
  return (
    <>
      <div>
        <p className="text-[15px] font-semibold text-muted">Hi {first}</p>
        <h1 className="text-[40px] leading-none font-extrabold">When do you need it in hand?</h1>
      </div>
      <BookingClient
        today={input.today}
        capacity={capacity}
        rushUsed={rushUsed}
        rules={{
          turnaround_days: ctx.rules.turnaround_days,
          rush_min_days: ctx.rules.rush_min_days,
          rush_per_week: ctx.rules.rush_per_week,
          rush_max_pieces: ctx.rules.rush_max_pieces,
          rush_fee_pct: ctx.rules.rush_fee_pct,
          hold_hours: ctx.rules.hold_hours,
        }}
      />
    </>
  );
}
