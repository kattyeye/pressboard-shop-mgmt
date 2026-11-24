// A team-color swatch: the garment color with the print color inside.
export function GarmentChip({
  garment,
  ink,
  label,
  size = 30,
}: {
  garment: string | null;
  ink: string | null;
  label: string | null;
  size?: number;
}) {
  const g = garment ?? "#DDDDDD";
  const i = ink ?? "#FFFFFF";
  return (
    <svg width={size} height={(size * 24) / 34} viewBox="0 0 34 24" role="img" aria-label={label ?? "Garment colors"}>
      <rect x="0.5" y="0.5" width="33" height="23" rx="6" fill={g} stroke="#AEB4BC" />
      <circle cx="17" cy="12" r="6.5" fill={i} stroke={i.toUpperCase() === "#FFFFFF" ? "#C9CED4" : "none"} />
    </svg>
  );
}
