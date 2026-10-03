/** Prices span $100,000 down to $0.0000001, so precision follows magnitude. */
export function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (abs >= 0.01) return n.toFixed(5);
  if (abs === 0) return "0";
  // Tiny prices: keep 4 significant digits after the leading zeros.
  const zeros = Math.floor(-Math.log10(abs));
  return n.toFixed(Math.min(zeros + 4, 12));
}

export function fmtUsd(n: number, digits = 2): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtSignedUsd(n: number, digits = 2): string {
  return `${n > 0 ? "+" : ""}${fmtUsd(n, digits)}`;
}

export function fmtPct(n: number | null, digits = 2): string {
  if (n === null || !Number.isFinite(n)) return "n/a";
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}%`;
}

export function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function shortAddress(a: string): string {
  return a.length > 14 ? `${a.slice(0, 5)}...${a.slice(-4)}` : a;
}
