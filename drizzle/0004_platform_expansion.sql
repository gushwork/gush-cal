-- platform expansion: teams, settings, integrations, meeting extensions

CREATE TABLE IF NOT EXISTS "calendar_settings" (
  "calendar_id" uuid PRIMARY KEY NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "settings" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "teams_calendar_slug_idx" ON "teams" ("calendar_id", "slug");
CREATE INDEX IF NOT EXISTS "teams_calendar_id_idx" ON "teams" ("calendar_id");

CREATE TABLE IF NOT EXISTS "team_members" (
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL REFERENCES "calendar_members"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_pair_idx" ON "team_members" ("team_id", "member_id");

CREATE TABLE IF NOT EXISTS "booking_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "slug" text NOT NULL,
  "team_id" uuid REFERENCES "teams"("id") ON DELETE set null,
  "member_id" uuid REFERENCES "calendar_members"("id") ON DELETE set null,
  "redirect_override" text,
  "enabled" boolean DEFAULT true NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "booking_links_calendar_slug_idx" ON "booking_links" ("calendar_id", "slug");

ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "team_id" uuid REFERENCES "teams"("id") ON DELETE set null;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "booking_link_id" uuid REFERENCES "booking_links"("id") ON DELETE set null;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "meetings_guest_email_active_idx" ON "meetings" ("guest_email", "starts_at");

CREATE TABLE IF NOT EXISTS "salesforce_connections" (
  "calendar_id" uuid PRIMARY KEY NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "instance_url" text NOT NULL,
  "connected_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "salesforce_field_maps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "object_api_name" text NOT NULL,
  "lookup_by_email" boolean DEFAULT true NOT NULL,
  "create_if_missing" boolean DEFAULT false NOT NULL,
  "field_mappings" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "meeting_manage_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "meetings"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "url" text NOT NULL,
  "secret" text NOT NULL,
  "enabled_events" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "key_hash" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "event_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scheduled_triggers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "meeting_id" uuid NOT NULL REFERENCES "meetings"("id") ON DELETE cascade,
  "trigger_type" text NOT NULL,
  "fire_at" timestamp with time zone NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "payload" jsonb
);

CREATE TABLE IF NOT EXISTS "email_sequences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "trigger_event" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_sequence_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sequence_id" uuid NOT NULL REFERENCES "email_sequences"("id") ON DELETE cascade,
  "step_order" integer NOT NULL,
  "delay_minutes" integer NOT NULL,
  "action" text NOT NULL,
  "subject_template" text,
  "body_template" text
);
