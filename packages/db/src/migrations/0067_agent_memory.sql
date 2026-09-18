CREATE TABLE "profile_note" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"run_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "agent_fact" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"source_run_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "agent_observation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"observed_on" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "profile_note" ADD CONSTRAINT "profile_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_note" ADD CONSTRAINT "profile_note_run_id_agent_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_fact" ADD CONSTRAINT "agent_fact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_fact" ADD CONSTRAINT "agent_fact_source_run_id_agent_run_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."agent_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_observation" ADD CONSTRAINT "agent_observation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_note_user_created_idx" ON "profile_note" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_note_user_read_idx" ON "profile_note" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_fact_user_key_unique" ON "agent_fact" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "agent_observation_user_observed_idx" ON "agent_observation" USING btree ("user_id","observed_on");
