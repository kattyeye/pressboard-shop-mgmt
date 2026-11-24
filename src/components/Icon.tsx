const PATHS = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  board: "M4 4h4v16H4zM10 4h4v11h-4zM16 4h4v7h-4z",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
  orders: "M6 3h9l4 4v14H6zM9 12h7M9 16h5",
  book: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
  check: "m5 12 4 4 10-10",
  left: "m15 5-7 7 7 7",
  right: "m9 5 7 7-7 7",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
