-- Webhook endpoints: add enable/disable flag (was UI-only, no backing column).
ALTER TABLE "webhook_endpoints" ADD COLUMN IF NOT EXISTS "enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
-- Backstop against double-booking the same member at the same instant.
-- Partial unique: cancelled meetings free the slot.
CREATE UNIQUE INDEX IF NOT EXISTS "meetings_member_active_slot_idx"
  ON "meetings" ("assigned_member_id", "starts_at")
  WHERE "cancelled_at" is null;
