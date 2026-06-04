const BOOKED_BY_LABELS: Record<string, string> = {
  scheduler: "Scheduler",
  guest: "Guest",
};

export function formatBookedBy(value: string): string {
  return BOOKED_BY_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}
