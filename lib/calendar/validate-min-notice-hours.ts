export function validateMinNoticeHours(value: number): string | null {
  if (!Number.isInteger(value)) {
    return "Minimum notice must be a whole number of hours";
  }
  if (value < 0 || value > 720) {
    return "Minimum notice must be between 0 and 720 hours";
  }
  return null;
}
