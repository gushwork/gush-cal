import type { CalendarSettings } from "@/lib/types/platform";
import type { WorkingHours } from "@/lib/types";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
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

export const calendarSettings = pgTable("calendar_settings", {
  calendarId: uuid("calendar_id")
    .primaryKey()
    .references(() => calendars.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull().$type<CalendarSettings>(),
});

export const calendarMembers = pgTable(
  "calendar_members",
  {
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
    assignmentWeight: integer("assignment_weight").notNull().default(100),
  },
  (table) => [index("calendar_members_calendar_id_idx").on(table.calendarId)],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("teams_calendar_slug_idx").on(table.calendarId, table.slug),
    index("teams_calendar_id_idx").on(table.calendarId),
  ],
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => calendarMembers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("team_members_pair_idx").on(table.teamId, table.memberId),
  ],
);

export const bookingLinks = pgTable(
  "booking_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<"team" | "member" | "calendar">(),
    slug: text("slug").notNull(),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    memberId: uuid("member_id").references(() => calendarMembers.id, {
      onDelete: "set null",
    }),
    redirectOverride: text("redirect_override"),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [
    uniqueIndex("booking_links_calendar_slug_idx").on(
      table.calendarId,
      table.slug,
    ),
  ],
);

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    assignedMemberId: uuid("assigned_member_id")
      .notNull()
      .references(() => calendarMembers.id),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    bookingLinkId: uuid("booking_link_id").references(() => bookingLinks.id, {
      onDelete: "set null",
    }),
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
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("meetings_calendar_starts_at_idx").on(table.calendarId, table.startsAt),
    index("meetings_member_starts_at_idx").on(
      table.assignedMemberId,
      table.startsAt,
    ),
    index("meetings_guest_email_active_idx").on(table.guestEmail, table.startsAt),
  ],
);

export const salesforceConnections = pgTable("salesforce_connections", {
  calendarId: uuid("calendar_id")
    .primaryKey()
    .references(() => calendars.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  instanceUrl: text("instance_url").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const salesforceFieldMaps = pgTable("salesforce_field_maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  eventType: text("event_type")
    .notNull()
    .$type<"book" | "cancel" | "reschedule" | "reassign">(),
  objectApiName: text("object_api_name").notNull(),
  lookupByEmail: boolean("lookup_by_email").notNull().default(true),
  createIfMissing: boolean("create_if_missing").notNull().default(false),
  fieldMappings: jsonb("field_mappings").notNull().$type<
    Array<{
      source: string;
      staticValue?: string;
      targetFieldApiName: string;
    }>
  >(),
});

export const meetingManageTokens = pgTable("meeting_manage_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  enabledEvents: jsonb("enabled_events").notNull().$type<string[]>(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  name: text("name").notNull(),
  createdBy: uuid("created_by").references(() => schedulers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
});

export const eventOutbox = pgTable("event_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", {
    withTimezone: true,
    mode: "string",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const scheduledTriggers = pgTable("scheduled_triggers", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  triggerType: text("trigger_type").notNull(),
  fireAt: timestamp("fire_at", { withTimezone: true, mode: "string" }).notNull(),
  status: text("status").notNull().default("pending"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
});

export const emailSequences = pgTable("email_sequences", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  triggerEvent: text("trigger_event").notNull(),
});

export const emailSequenceSteps = pgTable("email_sequence_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequenceId: uuid("sequence_id")
    .notNull()
    .references(() => emailSequences.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  delayMinutes: integer("delay_minutes").notNull(),
  timingAnchor: text("timing_anchor")
    .notNull()
    .default("after_booking")
    .$type<"after_booking" | "before_meeting" | "after_meeting">(),
  action: text("action").notNull().$type<"send_email" | "webhook" | "both">(),
  subjectTemplate: text("subject_template"),
  bodyTemplate: text("body_template"),
});

export type SchedulerRow = typeof schedulers.$inferSelect;
export type CalendarRow = typeof calendars.$inferSelect;
export type CalendarMemberRow = typeof calendarMembers.$inferSelect;
export type MeetingRow = typeof meetings.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type BookingLinkRow = typeof bookingLinks.$inferSelect;
export type CalendarSettingsRow = typeof calendarSettings.$inferSelect;
