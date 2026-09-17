ALTER TABLE "workspace_team_billing"
  ADD COLUMN "orch_messages_period_start" timestamp DEFAULT now() NOT NULL;

CREATE TABLE "workspace_team_billing_credit_grant" (
  "checkout_id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "workspace_team" ("id") ON DELETE cascade,
  "credits" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
