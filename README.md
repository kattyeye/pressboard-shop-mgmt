# PressBoard

Shop management for apparel decorators who work with team dealers. Work orders
come in, invoices go out, and rush requests happen on the shop's terms.

First shop: **Go For Effect** (contract decorator for the Alli Sports dealers).

## Milestone 1 (this branch)

A working app on sample data, with no outside services yet:

- **Sign-in and roles.** Owner, staff and sales rep. Row level security in the
  database decides what each person can see.
- **Today** (owner and staff): shop load for the next 10 working days, a
  "Needs you" list, and the orders board with a dealer filter.
- **Order page:** step an order from review to paid, with an activity history.
- **Capacity calendar:** owners mark days open, limited, full or closed. Staff
  can view but not change it.
- **Rep pages (phone-first):** My orders, booking a date with the shop's rush
  rules, a slot hold, and approving a proof or asking for changes.

Coming next: the email inbox and work-order reader (milestone 2), then
QuickBooks invoicing, proof images and notifications (milestone 3).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS 4), Manrope font
- Supabase: Postgres, Auth, row level security
- Hosted on Vercel

Cache Components is turned off in `next.config.ts` on purpose: every screen
reads the signed-in user's session and live shop data.

## Run it locally

```bash
npm ci
cp .env.example .env.local   # then fill in the values
npm run dev
```

### Environment

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe in the browser) |
| `NEXT_PUBLIC_DEMO_PASSWORD` | Demo only. Shows one-click demo sign-in buttons. Leave unset for a real shop. |

## Database

Migrations live in `supabase/migrations` and run in order:

1. `core_schema`: shops, rules, customers (dealers), contacts (reps),
   memberships, orders, items, history, capacity days, slot holds
2. `row_level_security`: who can see and change what
3. `rep_proof_actions`: lets a rep approve or comment on their own proof

### Demo data

- `supabase/seed/demo_data.sql` creates the Go For Effect demo shop. Its dates
  are relative to the day it runs.
- `supabase/seed/demo_users.template.sql` creates the demo sign-ins. Replace
  `__DEMO_PASSWORD__` before running it, and never commit the real password.

| Sign-in | Role |
| --- | --- |
| frances@example.com, karl@example.com | Owner |
| jamie@example.com | Staff |
| marcus@example.com (Baker's), dana@example.com (First Team) | Sales rep |

## Code map

- `src/app/(shop)`: owner and staff screens and their server actions
- `src/app/(rep)`: sales rep screens and their server actions
- `src/lib/dal.ts`: reads the session and routes people by role
- `src/lib/booking.ts`: the booking rules (standard, rush, full)
- `src/lib/theme.ts`: white-label colors with automatic readable text
- `src/proxy.ts`: refreshes the session and sends signed-out visitors to /login
