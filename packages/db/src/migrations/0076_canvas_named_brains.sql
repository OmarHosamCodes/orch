-- Freeze of the current spatial board into a Legacy Canvas brain. Do not fold a Canvas redesign into this migration.
CREATE TABLE "canvas_workspace" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "instructions" text NOT NULL DEFAULT '',
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "archived_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "canvas_workspace_owner_idx" ON "canvas_workspace" ("owner_user_id");
CREATE INDEX "canvas_workspace_owner_archived_idx" ON "canvas_workspace" ("owner_user_id", "archived_at");

INSERT INTO "canvas_workspace" ("id", "owner_user_id", "title", "created_at", "updated_at")
SELECT
  'cws-legacy-' || "owner_id",
  "owner_id",
  'Legacy Canvas',
  MIN("created_at"),
  MAX("updated_at")
FROM (
  SELECT "user_id" AS "owner_id", "created_at", "updated_at" FROM "dashboard_workspace"
) AS "board_owners"
GROUP BY "owner_id"
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "dashboard_workspace" ADD COLUMN "workspace_id" text;
ALTER TABLE "dashboard_workspace" ADD COLUMN "owner_user_id" text;

UPDATE "dashboard_workspace"
SET
  "workspace_id" = 'cws-legacy-' || "user_id",
  "owner_user_id" = "user_id";

INSERT INTO "canvas_workspace" ("id", "owner_user_id", "title")
SELECT "workspace_id", "owner_user_id", 'Legacy Canvas'
FROM "dashboard_workspace"
WHERE "workspace_id" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "dashboard_workspace" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "dashboard_workspace" ALTER COLUMN "owner_user_id" SET NOT NULL;
ALTER TABLE "dashboard_workspace" DROP CONSTRAINT "dashboard_workspace_pkey";
ALTER TABLE "dashboard_workspace" DROP CONSTRAINT "dashboard_workspace_user_id_user_id_fk";
ALTER TABLE "dashboard_workspace" ADD PRIMARY KEY ("workspace_id");
ALTER TABLE "dashboard_workspace" ADD CONSTRAINT "dashboard_workspace_workspace_id_canvas_workspace_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "canvas_workspace"("id") ON DELETE CASCADE;
ALTER TABLE "dashboard_workspace" ADD CONSTRAINT "dashboard_workspace_owner_user_id_user_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "dashboard_workspace" DROP COLUMN "user_id";
CREATE INDEX "dashboard_workspace_owner_idx" ON "dashboard_workspace" ("owner_user_id");

ALTER TABLE "dashboard_conversation" ADD COLUMN "canvas_workspace_id" text
  REFERENCES "canvas_workspace"("id") ON DELETE SET NULL;
CREATE INDEX "dashboard_conversation_user_workspace_idx"
  ON "dashboard_conversation" ("user_id", "canvas_workspace_id");

DO $$
BEGIN
  IF to_regclass('public.workspace_object') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE "workspace_object" ADD COLUMN IF NOT EXISTS "canvas_workspace_id" text;
  ALTER TABLE "workspace_relation" ADD COLUMN IF NOT EXISTS "canvas_workspace_id" text;
  ALTER TABLE "workspace_placement" ADD COLUMN IF NOT EXISTS "canvas_workspace_id" text;

  INSERT INTO "canvas_workspace" ("id", "owner_user_id", "title")
  SELECT DISTINCT 'cws-legacy-' || "owner_user_id", "owner_user_id", 'Legacy Canvas'
  FROM (
    SELECT "owner_user_id" FROM "workspace_object"
    UNION
    SELECT "owner_user_id" FROM "workspace_relation"
    UNION
    SELECT "owner_user_id" FROM "workspace_placement"
  ) AS "knowledge_owners"
  WHERE "owner_user_id" IS NOT NULL
  ON CONFLICT ("id") DO NOTHING;

  UPDATE "workspace_object"
  SET "canvas_workspace_id" = 'cws-legacy-' || "owner_user_id"
  WHERE "canvas_workspace_id" IS NULL;

  UPDATE "workspace_relation"
  SET "canvas_workspace_id" = 'cws-legacy-' || "owner_user_id"
  WHERE "canvas_workspace_id" IS NULL;

  UPDATE "workspace_placement"
  SET "canvas_workspace_id" = 'cws-legacy-' || "owner_user_id"
  WHERE "canvas_workspace_id" IS NULL;

  ALTER TABLE "workspace_object" ALTER COLUMN "canvas_workspace_id" SET NOT NULL;
  ALTER TABLE "workspace_relation" ALTER COLUMN "canvas_workspace_id" SET NOT NULL;
  ALTER TABLE "workspace_placement" ALTER COLUMN "canvas_workspace_id" SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_object_canvas_workspace_id_canvas_workspace_id_fk'
  ) THEN
    ALTER TABLE "workspace_object" ADD CONSTRAINT "workspace_object_canvas_workspace_id_canvas_workspace_id_fk"
      FOREIGN KEY ("canvas_workspace_id") REFERENCES "canvas_workspace"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_relation_canvas_workspace_id_canvas_workspace_id_fk'
  ) THEN
    ALTER TABLE "workspace_relation" ADD CONSTRAINT "workspace_relation_canvas_workspace_id_canvas_workspace_id_fk"
      FOREIGN KEY ("canvas_workspace_id") REFERENCES "canvas_workspace"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_placement_canvas_workspace_id_canvas_workspace_id_fk'
  ) THEN
    ALTER TABLE "workspace_placement" ADD CONSTRAINT "workspace_placement_canvas_workspace_id_canvas_workspace_id_fk"
      FOREIGN KEY ("canvas_workspace_id") REFERENCES "canvas_workspace"("id") ON DELETE CASCADE;
  END IF;

  CREATE INDEX IF NOT EXISTS "workspace_object_workspace_updated_idx"
    ON "workspace_object" ("canvas_workspace_id", "updated_at");
  CREATE INDEX IF NOT EXISTS "workspace_relation_workspace_idx"
    ON "workspace_relation" ("canvas_workspace_id");
  CREATE INDEX IF NOT EXISTS "workspace_placement_workspace_view_idx"
    ON "workspace_placement" ("canvas_workspace_id", "view_id");
END $$;
