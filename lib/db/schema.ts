import type { WorkingHours } from "@/lib/types";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const bookedByEnum = pgEnum("booked_by", ["scheduler", "guest"]);

export const schedulers = pgTable("schedulers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  googleSub: text("google_sub").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const calendars = pgTable("calendars", {
  id: uuid("id").primaryKey().defaultRandom(),
  schedulerId: uuid("scheduler_id")
    .notNull()
    .references(() => schedulers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bookingWindowDays: integer("booking_window_days").notNull(),
  minNoticeHours: integer("min_notice_hours").notNull(),
  defaultMaxPerDay: integer("default_max_per_day").notNull(),
  defaultMaxPerWeek: integer("default_max_per_week").notNull(),
  defaultWorkingHours: jsonb("default_working_hours")
    .notNull()
    .$type<WorkingHours>(),
  timezone: text("timezone").notNull().default("UTC"),
  durations: jsonb("durations").notNull().$type<number[]>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const calendarMembers = pgTable("calendar_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  displayName: text("display_name"),
  maxPerDayOverride: integer("max_per_day_override"),
  maxPerWeekOverride: integer("max_per_week_override"),
  workingHoursOverride: jsonb("working_hours_override").$type<WorkingHours | null>(),
  timezone: text("timezone"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  assignedMemberId: uuid("assigned_member_id")
    .notNull()
    .references(() => calendarMembers.id),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" })
    .notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  invitees: jsonb("invitees").notNull().$type<string[]>(),
  googleEventId: text("google_event_id").notNull(),
  meetLink: text("meet_link"),
  bookedBy: bookedByEnum("booked_by").notNull(),
  guestEmail: text("guest_email"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export type SchedulerRow = typeof schedulers.$inferSelect;
export type CalendarRow = typeof calendars.$inferSelect;
export type CalendarMemberRow = typeof calendarMembers.$inferSelect;
export type MeetingRow = typeof meetings.$inferSelect;
