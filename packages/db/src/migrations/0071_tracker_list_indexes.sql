CREATE INDEX IF NOT EXISTS "agency_ops_project_task_team_created_idx" ON "agency_ops_project_task" USING btree ("team_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_time_entry_mine_started_idx" ON "agency_ops_time_entry" USING btree ("team_id","user_id","started_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_ops_time_entry_user_task_live_idx" ON "agency_ops_time_entry" USING btree ("user_id","task_id") WHERE "deleted_at" IS NULL AND "task_id" IS NOT NULL;
