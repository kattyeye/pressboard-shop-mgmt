import Link from "next/link";

export default function IntakePage() {
  return (
    <div className="flex max-w-[640px] flex-col gap-4">
      <h1 className="text-[44px] leading-none font-extrabold">Scan a work order</h1>
      <p className="text-[17px] text-muted">
        The work-order reader arrives in milestone 2. You’ll photograph a work order or forward the email, and
        PressBoard fills in the order for you to check.
      </p>
      <Link href="/today" className="inline-flex min-h-11 w-fit items-center rounded-[10px] bg-ink px-4 font-bold text-white">
        Back to Today
      </Link>
    </div>
  );
}
