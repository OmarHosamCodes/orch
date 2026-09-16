ALTER TABLE "dashboard_conversation" ADD COLUMN "last_read_at" timestamp;--> statement-breakpoint
UPDATE "dashboard_conversation" SET "last_read_at" = "last_message_at" WHERE "last_read_at" IS NULL;
