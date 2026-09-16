ALTER TABLE "agency_ops_project" ADD COLUMN "icon_key" text;--> statement-breakpoint
ALTER TABLE "agency_ops_project" ADD COLUMN "icon_source" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" ADD COLUMN "icon_key" text;--> statement-breakpoint
ALTER TABLE "agency_ops_project_task" ADD COLUMN "icon_source" text DEFAULT 'auto' NOT NULL;
