CREATE TABLE "workspace_team_invite" (
  "id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL REFERENCES "workspace_team"("id") ON DELETE CASCADE,
  "invited_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "invited_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'viewer',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "responded_at" timestamp
);
CREATE UNIQUE INDEX "workspace_team_invite_team_user_unique" ON "workspace_team_invite" ("team_id", "invited_user_id");
CREATE INDEX "workspace_team_invite_invited_user_idx" ON "workspace_team_invite" ("invited_user_id");
CREATE INDEX "workspace_team_invite_team_status_idx" ON "workspace_team_invite" ("team_id", "status");
