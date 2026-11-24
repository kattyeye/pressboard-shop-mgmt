import type { ISODate } from "./dates";
import type { Stage } from "./stages";
import type { ShopTheme } from "./theme";

export type MemberRole = "owner" | "staff" | "sales_rep";
export type DayStatus = "open" | "limited" | "full" | "closed";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  time_zone: string;
  theme: ShopTheme;
};

export type ShopRules = {
  organization_id: string;
  daily_capacity: number;
  turnaround_days: number;
  rush_min_days: number;
  rush_fee_pct: number;
  rush_per_week: number;
  rush_max_pieces: number;
  hold_hours: number;
};

export type Membership = {
  role: MemberRole;
  organization_id: string;
  contact_id: string | null;
};

export type OrderRow = {
  id: string;
  number: number;
  end_client: string;
  dealer_po: string | null;
  stage: Stage;
  is_rush: boolean;
  in_hands_date: ISODate | null;
  press_date: ISODate | null;
  garment_hex: string | null;
  ink_hex: string | null;
  color_label: string | null;
  total_pieces: number;
  notes: string | null;
  customer: { id: string; name: string; short_name: string } | null;
  contact: { id: string; full_name: string } | null;
};

export type OrderItem = {
  id: string;
  position: number;
  description: string;
  decoration: string | null;
  sizes: Record<string, number>;
  quantity: number;
};

export type OrderEvent = {
  id: string;
  message: string;
  created_at: string;
  visible_to_rep: boolean;
};

export type CapacityDay = { day: ISODate; status: DayStatus; note: string | null };

export type SlotHold = {
  id: string;
  in_hands_date: ISODate;
  pieces: number;
  is_rush: boolean;
  status: "held" | "confirmed" | "released" | "expired";
  expires_at: string;
  contact: { full_name: string; customer: { short_name: string } | null } | null;
};

export const ORDER_SELECT =
  "id, number, end_client, dealer_po, stage, is_rush, in_hands_date, press_date, garment_hex, ink_hex, color_label, total_pieces, notes, customer:customers(id, name, short_name), contact:contacts(id, full_name)";
