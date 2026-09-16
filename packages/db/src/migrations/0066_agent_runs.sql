CREATE TABLE "agent_run" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"model" text NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"heartbeat_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "agent_run_event" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_conversation_id_dashboard_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dashboard_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run_event" ADD CONSTRAINT "agent_run_event_run_id_agent_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_run_user_created_idx" ON "agent_run" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_run_conversation_status_idx" ON "agent_run" USING btree ("conversation_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_run_event_run_seq_unique" ON "agent_run_event" USING btree ("run_id","seq");--> statement-breakpoint
CREATE INDEX "agent_run_event_run_seq_idx" ON "agent_run_event" USING btree ("run_id","seq");
