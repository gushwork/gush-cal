import { getBookingWindow } from "./time";

export function violatesMinNotice(input: {
  startsAt: string;
  minNoticeHours: number;
  viewerTimezone: string;
  now?: Date;
}): boolean {
  if (input.minNoticeHours <= 0) {
    return false;
  }

  const now = input.now ?? new Date();
  const { earliest } = getBookingWindow(
    now,
    input.minNoticeHours,
    0,
    input.viewerTimezone,
  );

  return new Date(input.startsAt).getTime() < earliest.getTime();
}
