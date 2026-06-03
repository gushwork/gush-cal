ALTER TABLE "calendars" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_members" ADD COLUMN "timezone" text;
