/** ISO 8601 UTC instant */
export type UtcInstant = string;

/** IANA timezone, e.g. "America/New_York" */
export type IanaTimezone = string;

/** Minutes from midnight, 0–1439 */
export type MinutesOfDay = number;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0

export type WorkingHoursBlock = {
  day: DayOfWeek;
  start: MinutesOfDay;
  end: MinutesOfDay;
};

export type WorkingHours = WorkingHoursBlock[];

export type Scheduler = {
  id: string;
  email: string;
  name: string;
  googleSub: string;
  createdAt: UtcInstant;
};

export type Calendar = {
  id: string;
  schedulerId: string;
  name: string;
  slug: string;
  bookingWindowDays: number;
  minNoticeHours: number;
  defaultMaxPerDay: number;
  defaultMaxPerWeek: number;
  defaultWorkingHours: WorkingHours;
  timezone: IanaTimezone;
  /** Subset of [15, 30, 45, 60, 90] */
  durations: number[];
  createdAt: UtcInstant;
};

export type CalendarMember = {
  id: string;
  calendarId: string;
  email: string;
  displayName: string | null;
  maxPerDayOverride: number | null;
  maxPerWeekOverride: number | null;
  workingHoursOverride: WorkingHours | null;
  timezone: IanaTimezone | null;
  sortOrder: number;
};

export type BookedBy = "scheduler" | "guest";

export type Meeting = {
  id: string;
  calendarId: string;
  assignedMemberId: string;
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  body: string;
  invitees: string[];
  googleEventId: string;
  meetLink: string | null;
  bookedBy: BookedBy;
  guestEmail: string | null;
  createdAt: UtcInstant;
};

/** Calendar + members loaded for slot/assignment */
export type CalendarBundle = Calendar & {
  members: CalendarMember[];
  scheduler: Pick<Scheduler, "id" | "email" | "name">;
};

export type Slot = {
  startsAt: UtcInstant;
  durationMinutes: number;
  /** At least one eligible member exists */
  eligibleMemberCount: number;
};

export type MemberAvailabilityStatus = "accessible" | "inaccessible";

export type MemberBusyBlock = {
  memberId: string;
  email: string;
  status: MemberAvailabilityStatus;
  /** Present when status is "inaccessible" — FreeBusy error reason */
  errorCode?: string;
  busy: Array<{ start: UtcInstant; end: UtcInstant }>;
};

export type AssignmentResult =
  | { ok: true; member: CalendarMember; meeting: Meeting }
  | { ok: false; code: "SLOT_UNAVAILABLE" | "GOOGLE_ERROR" };

export type {
  CreateCalendarBody,
  UpdateCalendarBody,
  CreateMemberBody,
  UpdateMemberBody,
  ConfirmBookingBody,
  PublicCalendar,
  PublicMeeting,
} from "./api";
