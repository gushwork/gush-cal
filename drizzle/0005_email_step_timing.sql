ALTER TABLE "email_sequence_steps"
ADD COLUMN IF NOT EXISTS "timing_anchor" text NOT NULL DEFAULT 'after_booking';
