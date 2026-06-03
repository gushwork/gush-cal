CREATE TYPE "booked_by" AS ENUM('scheduler', 'guest');--> statement-breakpoint
CREATE TABLE "schedulers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"google_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedulers_email_unique" UNIQUE("email"),
	CONSTRAINT "schedulers_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
CREATE TABLE "calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduler_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"booking_window_days" integer NOT NULL,
	"min_notice_hours" integer NOT NULL,
	"default_max_per_day" integer NOT NULL,
	"default_max_per_week" integer NOT NULL,
	"default_working_hours" jsonb NOT NULL,
	"durations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "calendar_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"max_per_day_override" integer,
	"max_per_week_override" integer,
	"working_hours_override" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_id" uuid NOT NULL,
	"assigned_member_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"invitees" jsonb NOT NULL,
	"google_event_id" text NOT NULL,
	"meet_link" text,
	"booked_by" "booked_by" NOT NULL,
	"guest_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_scheduler_id_schedulers_id_fk" FOREIGN KEY ("scheduler_id") REFERENCES "public"."schedulers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_members" ADD CONSTRAINT "calendar_members_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_assigned_member_id_calendar_members_id_fk" FOREIGN KEY ("assigned_member_id") REFERENCES "public"."calendar_members"("id") ON DELETE no action ON UPDATE no action;
