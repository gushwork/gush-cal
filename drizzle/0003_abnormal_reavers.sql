CREATE INDEX "calendar_members_calendar_id_idx" ON "calendar_members" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "meetings_calendar_starts_at_idx" ON "meetings" USING btree ("calendar_id","starts_at");--> statement-breakpoint
CREATE INDEX "meetings_member_starts_at_idx" ON "meetings" USING btree ("assigned_member_id","starts_at");
