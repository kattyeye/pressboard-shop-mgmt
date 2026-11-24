export const STAGES = [
  "review",
  "proof_sent",
  "approved",
  "scheduled",
  "on_press",
  "finishing",
  "packed",
  "shipped",
  "invoiced",
  "paid",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  review: "Review",
  proof_sent: "Proof sent",
  approved: "Approved",
  scheduled: "Scheduled",
  on_press: "On press",
  finishing: "Finishing",
  packed: "Packed",
  shipped: "Shipped",
  invoiced: "Invoiced",
  paid: "Paid",
};

/** What the next-step button says while an order sits in each stage. */
export const NEXT_ACTION: Record<Stage, string | null> = {
  review: "Approve order and send the proof",
  proof_sent: "Mark proof approved",
  approved: "Put it on the calendar",
  scheduled: "Start production",
  on_press: "Move to finishing",
  finishing: "Mark packed",
  packed: "Mark shipped",
  shipped: "Mark invoiced",
  invoiced: "Mark paid",
  paid: null,
};

/** What the next step means, shown above the button. */
export const STAGE_HINT: Record<Stage, string> = {
  review: "Check what was read from the work order, then send the rep a proof.",
  proof_sent: "Waiting on the rep to approve the proof. They can approve it from their phone.",
  approved: "The proof is approved. Pick a press day that fits the in-hands date.",
  scheduled: "On the calendar. Blanks should be counted in before press day.",
  on_press: "Pressing now. The job ticket QR code moves it along from the shop floor.",
  finishing: "Fold, bag and tag by size.",
  packed: "Boxes packed and photographed. Hand them to the carrier next.",
  shipped: "Shipped. Next comes the invoice (QuickBooks connects in milestone 3).",
  invoiced: "Invoice sent. Mark it paid when the payment arrives.",
  paid: "Paid and closed. Everything stays on file.",
};

export const ACTIVE_STAGES: Stage[] = [
  "review",
  "proof_sent",
  "approved",
  "scheduled",
  "on_press",
  "finishing",
  "packed",
  "shipped",
];

export const BOARD_COLUMNS: { key: string; label: string; stages: Stage[] }[] = [
  { key: "review", label: "Review", stages: ["review"] },
  { key: "proofing", label: "Proofing", stages: ["proof_sent", "approved"] },
  { key: "scheduled", label: "Scheduled", stages: ["scheduled"] },
  { key: "on_press", label: "On press", stages: ["on_press"] },
  { key: "finishing", label: "Finishing", stages: ["finishing"] },
  { key: "ready", label: "Ready to ship", stages: ["packed"] },
];

/** Plain-language status a sales rep sees. */
export const REP_STATUS: Record<Stage, string> = {
  review: "Received. We're checking it.",
  proof_sent: "Proof ready for you",
  approved: "Proof approved",
  scheduled: "Scheduled",
  on_press: "In production",
  finishing: "In production",
  packed: "Packed, shipping soon",
  shipped: "Shipped",
  invoiced: "Delivered",
  paid: "Delivered",
};

/** Rep progress: 6 bars (received, proof, scheduled, production, packed, shipped). */
export const REP_PROGRESS: Record<Stage, number> = {
  review: 1,
  proof_sent: 1,
  approved: 2,
  scheduled: 3,
  on_press: 4,
  finishing: 4,
  packed: 5,
  shipped: 6,
  invoiced: 6,
  paid: 6,
};

export const DONE_FOR_REP: Stage[] = ["invoiced", "paid"];
