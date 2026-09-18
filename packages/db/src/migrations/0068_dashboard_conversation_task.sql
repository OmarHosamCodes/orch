ALTER TABLE "dashboard_conversation" ADD COLUMN "task_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_conversation_user_task_unique" ON "dashboard_conversation" USING btree ("user_id","task_id") WHERE "task_id" is not null;
