CREATE TABLE "workspace_team_billing" (
  "team_id" text PRIMARY KEY NOT NULL REFERENCES "workspace_team"("id") ON DELETE CASCADE,
  "plan" text NOT NULL DEFAULT 'trial',
  "seats" integer NOT NULL DEFAULT 1,
  "trial_ends_at" timestamp NOT NULL,
  "polar_subscription_id" text,
  "polar_product_id" text,
  "orch_messages_used" integer NOT NULL DEFAULT 0,
  "orch_credits_remaining" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "workspace_team_billing_polar_sub_idx" ON "workspace_team_billing" ("polar_subscription_id");
