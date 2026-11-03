const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Fixed-locale formatters: analytics render on the server only. */
export function formatCount(value: number): string {
  return integer.format(value);
}

export function formatDecimal(value: number): string {
  return oneDecimal.format(value);
}

export function formatPercent(ratio: number | null, digits = 0): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatHours(hours: number): string {
  if (hours > 0 && hours < 1) return `${Math.round(hours * 60)}m`;
  return `${oneDecimal.format(hours)}h`;
}

/** Signed percentage-point difference between two ratios ("+4.2 pts"). */
export function formatPointDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return (current - previous) * 100;
}
