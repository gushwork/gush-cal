ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "schedulers"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone;
