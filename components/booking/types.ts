import type { IanaTimezone, Slot } from "@/lib/types";

export type BookingWizardStep = "duration" | "date" | "time" | "details" | "done";

export type DateKey = string; // YYYY-MM-DD in viewer timezone

export type MonthSlotsCacheKey = `${number}-${number}|${number}|${string}`;

export type GroupedSlots = Map<DateKey, Slot[]>;

export type BookingFlowProps = {
  calendarName: string;
  durations: number[];
  bookingWindowDays: number;
  slotsApiPath: string;
  confirmApiPath: string;
  isPublic?: boolean;
  showPanelistCount?: boolean;
  calendarSlug?: string;
  onConfirmed?: (meeting: import("@/lib/types").PublicMeeting) => void;
};
