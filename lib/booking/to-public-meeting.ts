import type { Calendar, Meeting, PublicCalendar, PublicMeeting } from "@/lib/types";

export function toPublicCalendar(calendar: Pick<
  Calendar,
  "name" | "slug" | "durations" | "bookingWindowDays" | "minNoticeHours"
>): PublicCalendar {
  return {
    name: calendar.name,
    slug: calendar.slug,
    durations: calendar.durations,
    bookingWindowDays: calendar.bookingWindowDays,
    minNoticeHours: calendar.minNoticeHours,
  };
}

export function toPublicMeeting(meeting: Meeting): PublicMeeting {
  return {
    startsAt: meeting.startsAt,
    durationMinutes: meeting.durationMinutes,
    subject: meeting.subject,
    meetLink: meeting.meetLink,
  };
}
