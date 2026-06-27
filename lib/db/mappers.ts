import type {
  Calendar,
  CalendarMember,
  Meeting,
  Scheduler,
  UtcInstant,
  WorkingHours,
} from "@/lib/types";
import type {
  CalendarMemberRow,
  CalendarRow,
  MeetingRow,
  SchedulerRow,
} from "./schema";

export function toScheduler(row: SchedulerRow): Scheduler {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    googleSub: row.googleSub,
    createdAt: row.createdAt as UtcInstant,
  };
}

export function toCalendar(row: CalendarRow): Calendar {
  return {
    id: row.id,
    schedulerId: row.schedulerId,
    name: row.name,
    slug: row.slug,
    bookingWindowDays: row.bookingWindowDays,
    minNoticeHours: row.minNoticeHours,
    defaultMaxPerDay: row.defaultMaxPerDay,
    defaultMaxPerWeek: row.defaultMaxPerWeek,
    defaultWorkingHours: row.defaultWorkingHours as WorkingHours,
    timezone: row.timezone,
    durations: row.durations,
    createdAt: row.createdAt as UtcInstant,
  };
}

export function toCalendarMember(row: CalendarMemberRow): CalendarMember {
  return {
    id: row.id,
    calendarId: row.calendarId,
    email: row.email,
    displayName: row.displayName,
    maxPerDayOverride: row.maxPerDayOverride,
    maxPerWeekOverride: row.maxPerWeekOverride,
    workingHoursOverride: row.workingHoursOverride as WorkingHours | null,
    timezone: row.timezone,
    sortOrder: row.sortOrder,
    assignmentWeight: row.assignmentWeight,
  };
}

export function toMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    calendarId: row.calendarId,
    assignedMemberId: row.assignedMemberId,
    startsAt: row.startsAt as UtcInstant,
    durationMinutes: row.durationMinutes,
    subject: row.subject,
    body: row.body,
    invitees: row.invitees,
    googleEventId: row.googleEventId,
    meetLink: row.meetLink,
    bookedBy: row.bookedBy,
    guestEmail: row.guestEmail,
    teamId: row.teamId,
    bookingLinkId: row.bookingLinkId,
    cancelledAt: (row.cancelledAt as UtcInstant | null) ?? null,
    createdAt: row.createdAt as UtcInstant,
  };
}
