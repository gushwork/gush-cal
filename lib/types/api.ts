import type { IanaTimezone, UtcInstant, WorkingHours } from "./index";

export type CreateCalendarBody = {
  name: string;
  bookingWindowDays: number;
  minNoticeHours: number;
  defaultMaxPerDay: number;
  defaultMaxPerWeek: number;
  defaultWorkingHours: WorkingHours;
  timezone: IanaTimezone;
  durations: number[];
};

export type UpdateCalendarBody = Partial<CreateCalendarBody> & {
  name?: string;
  slug?: string;
  randomizeSlug?: boolean;
};

export type CreateMemberBody = {
  email: string;
  displayName?: string;
  maxPerDayOverride?: number;
  maxPerWeekOverride?: number;
  workingHoursOverride?: WorkingHours | null;
  timezone?: IanaTimezone | null;
};

export type UpdateMemberBody = Partial<CreateMemberBody>;

export type ConfirmBookingBody = {
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  body: string;
  invitees: string[];
  guestEmail?: string;
  viewerTimezone: IanaTimezone;
};

export type PublicCalendar = {
  name: string;
  slug: string;
  durations: number[];
  bookingWindowDays: number;
  minNoticeHours: number;
};

export type PublicMeeting = {
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  meetLink: string | null;
};
