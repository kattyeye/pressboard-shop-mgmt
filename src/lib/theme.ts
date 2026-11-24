import type { CSSProperties } from "react";

// A shop's white-label colors. Text colors and tints are derived so that
// whatever a shop picks, text stays readable (WCAG contrast).
export type ShopTheme = {
  brand?: string; // action buttons, today
  second?: string; // full days, links, active menu
  ink?: string; // text and dark buttons
  background?: string;
  soft?: string; // "limited" days
  warm?: string; // rush and urgent
  highlight?: string; // "needs a look" flags
};

export const DEFAULT_THEME: Required<ShopTheme> = {
  brand: "#EE9B00",
  second: "#005F73",
  ink: "#001219",
  background: "#F7F2E2",
  soft: "#9EC2CA",
  warm: "#BB3E03",
  highlight: "#FAE3B8",
};

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

function parse(hex?: string): RGB | null {
  if (!hex) return null;
  let s = hex.trim().replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(c: RGB): string {
  return (
    "#" +
    c
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function luminance(c: RGB): number {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

export function contrast(a: RGB, b: RGB): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Move a color toward `toward` until it reaches the target contrast on `bg`.
function push(c: RGB, bg: RGB, target: number, toward: RGB): RGB {
  let out = c;
  for (let i = 0; i < 40 && contrast(out, bg) < target; i++) out = mix(out, toward, 0.08);
  return out;
}

export function themeVars(theme: ShopTheme | null | undefined): CSSProperties {
  const t = { ...DEFAULT_THEME, ...(theme ?? {}) };
  const brand = parse(t.brand) ?? parse(DEFAULT_THEME.brand)!;
  const second = parse(t.second) ?? brand;
  const ink = push(parse(t.ink) ?? BLACK, WHITE, 7, BLACK);
  const ground = parse(t.background) ?? mix(ink, WHITE, 0.92);
  const warm = parse(t.warm) ?? brand;
  const warmTint = mix(warm, WHITE, 0.82);
  const onBrand =
    contrast(brand, WHITE) >= 4.5 ? WHITE : contrast(brand, ink) >= 4.5 ? ink : BLACK;
  const secondText = push(second, WHITE, 4.5, BLACK);

  const vars: Record<string, string> = {
    "--brand": toHex(brand),
    "--on-brand": toHex(onBrand),
    "--brand-text": toHex(secondText),
    "--brand-tint": toHex(mix(second, WHITE, 0.86)),
    "--ink": toHex(ink),
    "--soft": toHex(parse(t.soft) ?? mix(second, WHITE, 0.62)),
    "--line": toHex(mix(ink, ground, 0.84)),
    "--ground": toHex(ground),
    "--muted": toHex(push(mix(ink, WHITE, 0.28), ground, 4.5, BLACK)),
    "--hover": toHex(mix(ink, ground, 0.9)),
    "--warm": toHex(warm),
    "--warm-tint": toHex(warmTint),
    "--warm-text": toHex(push(warm, warmTint, 4.5, BLACK)),
    "--full": toHex(secondText),
    "--highlight": toHex(parse(t.highlight) ?? mix(brand, WHITE, 0.72)),
  };
  return vars as CSSProperties;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "PB"
  );
}
